"""Cross-app end-to-end test (customer pass <-> merchant terminal), real Postgres + PostgREST.

The customer app renders its own QR; we decode it with OpenCV, then play that exact image to the
merchant terminal's fake camera. The merchant UI scans and stamps; the customer app then shows it.
Env: E2E_PSQL (default "psql -d e2e"), CUSTOMER_URL (8081), MERCHANT_URL (8080), CHROMIUM_PATH (optional).
"""
import os, re, subprocess, sys, time
import cv2
import numpy as np
from playwright.sync_api import sync_playwright, expect

PSQL = os.environ.get("E2E_PSQL", "psql -d e2e")
CUSTOMER_URL = os.environ.get("CUSTOMER_URL", "http://localhost:8081")
MERCHANT_URL = os.environ.get("MERCHANT_URL", "http://localhost:8080")
CHROMIUM = os.environ.get("CHROMIUM_PATH")
EVE = "e0000000-0000-4000-8000-000000000001"
TOKEN_RE = re.compile(r"^LS1\.([0-9a-f-]{36})\.(\d+)\.([0-9a-f]{32})$")

results = []
def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail else ""), flush=True)

def sql(q):
    return subprocess.run(f'{PSQL} -tAc "{q}"', shell=True, capture_output=True, text=True).stdout.strip()

def server_sig_ok(token):
    m = TOKEN_RE.match(token)
    if not m: return False
    uid, step, sig = m.groups()
    expected = sql(f"select left(encode(extensions.hmac('{uid}.{step}', secret, 'sha256'),'hex'),32) "
                   f"from private.customer_qr_secrets where customer_id='{uid}'")
    return expected == sig

def decode_qr_png(path):
    img = cv2.imread(path)
    img = cv2.copyMakeBorder(img, 60, 60, 60, 60, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    detectors = [cv2.QRCodeDetector()]
    if hasattr(cv2, "QRCodeDetectorAruco"):
        detectors.append(cv2.QRCodeDetectorAruco())
    for scale in (1.0, 0.6, 1.5):
        im = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_NEAREST)
        for d in detectors:
            text, _, _ = d.detectAndDecode(im)
            if text:
                return text
    return ""

def png_to_y4m(png, out):
    g = cv2.cvtColor(cv2.imread(png), cv2.COLOR_BGR2GRAY)
    g = cv2.copyMakeBorder(g, 40, 40, 40, 40, cv2.BORDER_CONSTANT, value=255)
    W, H = 640, 480
    side = 380
    g = cv2.resize(g, (side, side), interpolation=cv2.INTER_NEAREST)
    frame = np.full((H, W), 40, np.uint8)
    y0, x0 = (H - side) // 2, (W - side) // 2
    frame[y0:y0 + side, x0:x0 + side] = g
    uv = np.full((H // 2) * (W // 2) * 2, 128, np.uint8).tobytes()
    with open(out, "wb") as f:
        f.write(f"YUV4MPEG2 W{W} H{H} F10:1 Ip A1:1 C420jpeg\n".encode())
        for _ in range(20):
            f.write(b"FRAME\n"); f.write(frame.tobytes()); f.write(uv)

errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROMIUM, args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 420, "height": 900}, device_scale_factor=2, service_workers="allow")
    page = ctx.new_page()
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append("PAGEERROR " + str(e)))
    page.on("dialog", lambda d: d.accept())

    # 1. Invite link works before sign-in (public RPC as anon)
    page.goto(f"{CUSTOMER_URL}/join/blue-bottle")
    expect(page.get_by_text("Join Blue Bottle Coffee Rewards")).to_be_visible(timeout=10000)
    check("join link shows public branding + program", page.get_by_text("Collect 7 stamps").is_visible())
    page.screenshot(path="/tmp/c1_join.png")

    # 2. Passwordless sign-in (wrong code, then right code)
    page.fill("#email", "eve@mail.test"); page.get_by_role("button", name="Email me a sign-in code").click()
    page.fill("#code", "000000"); page.get_by_role("button", name="Open my pass").click()
    expect(page.get_by_text("That code is invalid or expired")).to_be_visible(timeout=5000)
    check("wrong one-time code rejected", True)
    page.fill("#code", "123456"); page.get_by_role("button", name="Open my pass").click()

    # 3. New account asks for a name, saved to own profile only
    expect(page.get_by_text("What should we call you?")).to_be_visible(timeout=10000)
    page.fill("input[aria-label='Full name']", "Eve Martin"); page.get_by_role("button", name="Continue").click()
    expect(page.get_by_text("Member Stamp Pass")).to_be_visible(timeout=10000)
    check("name saved server-side", sql(f"select full_name from profiles where id='{EVE}'") == "Eve Martin")
    body = page.inner_text("body")
    check("joined business shown as pending card (0/7)", "Blue Bottle Coffee" in body and "0/7 Stamps" in body and "Joined" in body)
    check("URL cleaned after join", page.url.rstrip("/") == CUSTOMER_URL)
    page.screenshot(path="/tmp/c2_pass_empty.png")

    # 4. Real QR from the customer app: decode it
    page.get_by_role("button", name=re.compile(r"Show Member Pass")).click()
    qr_box = page.locator("svg[aria-label='Rotating member pass QR code']").locator("xpath=..")
    expect(qr_box.locator("svg")).to_be_visible(timeout=5000)
    page.wait_for_timeout(300)
    qr_box.screenshot(path="/tmp/c_qr.png")
    page.screenshot(path="/tmp/c3_qr_modal.png")
    token = decode_qr_png("/tmp/c_qr.png")
    m = TOKEN_RE.match(token or "")
    check("customer QR decodes to LS1 token for this user", bool(m) and m.group(1) == EVE, (token or "")[:48])
    check("customer-generated signature matches server secret", server_sig_ok(token or ""))
    page.get_by_role("button", name="Close Pass", exact=True).click()

    # 5. Cross-app: play the customer's QR to the merchant terminal's camera
    png_to_y4m("/tmp/c_qr.png", "/tmp/eve.y4m")
    mb = p.chromium.launch(executable_path=CHROMIUM, args=["--no-sandbox", "--use-fake-device-for-media-stream",
                          "--use-fake-ui-for-media-stream", "--use-file-for-fake-video-capture=/tmp/eve.y4m"])
    mctx = mb.new_context(viewport={"width": 1440, "height": 1000}, permissions=["camera"])
    mp = mctx.new_page()
    mp.goto(MERCHANT_URL)
    mp.fill("#email", "sam@cafe.test"); mp.fill("#password", "pass1234"); mp.click("button[type=submit]")
    modal = mp.locator("div.fixed.inset-0.z-50").filter(has_text="Current Stamp Balance")
    expect(modal).to_be_visible(timeout=45000)  # camera start + decode can be slow on CI
    check("merchant camera scanned the customer app's QR", "Eve M." in modal.inner_text())
    modal.get_by_role("button", name="+1 ADD STAMP").click()
    expect(mp.get_by_text("+1 Stamp Recorded")).to_be_visible(timeout=8000)
    mb.close()
    check("stamp written by merchant RPC", sql(f"select stamp_count from loyalty_cards where customer_id='{EVE}'") == "1")

    # 6. Customer sees it (manual resync; live Realtime isn't available in this harness)
    page.get_by_role("button", name="Refresh").click()
    expect(page.get_by_text("1/7 Stamps").first).to_be_visible(timeout=8000)
    check("customer pass shows server stamp (1/7)", True)
    page.get_by_role("button", name="History").click()
    hist = page.locator("main").inner_text()
    check("history shows verified stamp + store location", "+1 Stamp" in hist and "Verified" in hist and "Ferry Building" in hist, re.sub(r"\s+", " ", hist)[:100])
    page.screenshot(path="/tmp/c4_history.png")
    page.get_by_role("button", name="Digital Punch Pass").click()

    # 7. Customer cannot write loyalty data, even calling the API directly with its own JWT
    probe = page.evaluate("""async () => {
      const s = JSON.parse(localStorage.getItem('customer-pass-auth'));
      const h = {'apikey':'x','Authorization':'Bearer '+s.access_token,'Content-Type':'application/json'};
      const patch = await fetch('/rest/v1/loyalty_cards?customer_id=eq.'+s.user.id,{method:'PATCH',headers:h,body:JSON.stringify({stamp_count:99})});
      const ins = await fetch('/rest/v1/stamp_events',{method:'POST',headers:h,body:JSON.stringify({quantity:5})});
      const rpc = await fetch('/rest/v1/rpc/issue_stamp_for_scan',{method:'POST',headers:h,body:JSON.stringify({p_customer_id:s.user.id,p_program_id:'00000000-0000-4000-8000-000000000000',p_quantity:1,p_location_id:null})});
      return [patch.status, ins.status, rpc.status, (await rpc.json()).message];
    }""")
    check("direct PATCH/INSERT/RPC writes refused", probe[0] in (401, 403) and probe[1] in (401, 403) and probe[3] == "PROGRAM_NOT_FOUND", str(probe))
    check("card unchanged after attack", sql(f"select stamp_count from loyalty_cards where customer_id='{EVE}'") == "1")

    # 8. Offline: app shell from service worker, cached wallet, QR still generated locally
    page.reload(); page.wait_for_timeout(1500)   # ensure the SW controls the page
    controlled = page.evaluate("() => !!navigator.serviceWorker.controller")
    ctx.set_offline(True)
    page.reload()
    expect(page.get_by_text(re.compile("Offline · showing your pass"))).to_be_visible(timeout=8000)
    check("offline: shell + cached wallet render (SW controlled)", controlled and page.get_by_text("1/7 Stamps").first.is_visible())
    page.get_by_role("button", name=re.compile(r"Show Member Pass")).click()
    qr_box = page.locator("svg[aria-label='Rotating member pass QR code']").locator("xpath=..")
    expect(qr_box.locator("svg")).to_be_visible(timeout=5000)
    page.wait_for_timeout(300); qr_box.screenshot(path="/tmp/c_qr_off.png")
    off_token = decode_qr_png("/tmp/c_qr_off.png")
    check("offline QR is a valid server-verifiable token", server_sig_ok(off_token or ""), (off_token or "")[:48])
    page.screenshot(path="/tmp/c5_offline_qr.png")
    page.get_by_role("button", name="Close Pass", exact=True).click()
    ctx.set_offline(False)

    # 9. Reset pass code: old codes stop verifying
    page.wait_for_timeout(800)
    page.locator("button[title='Switch loyalty card']").click()
    page.get_by_role("button", name="Reset Pass Code").click()
    expect(page.get_by_text("Pass code reset")).to_be_visible(timeout=8000)
    check("rotated secret invalidates old token", not server_sig_ok(off_token or ""))

    # 10. Sign out wipes this user's local data
    page.locator("button[title='Switch loyalty card']").click()
    page.get_by_role("button", name="Sign Out").click()
    expect(page.locator("#email")).to_be_visible(timeout=8000)
    leftovers = page.evaluate(f"() => Object.keys(localStorage).filter(k => k.includes('{EVE}'))")
    check("sign-out clears cached wallet + QR secret", leftovers == [], str(leftovers))

    # 11. Another customer sees nothing of Eve
    page.fill("#email", "carl@mail.test"); page.get_by_role("button", name="Email me a sign-in code").click()
    page.fill("#code", "123456"); page.get_by_role("button", name="Open my pass").click()
    expect(page.get_by_text("Member Stamp Pass")).to_be_visible(timeout=10000)
    body = page.inner_text("body")
    check("other customer isolated (no Eve data, own name)", "Carl Mendes" in body and "Eve" not in body)
    check("customer without cards sees clean empty state (no template card)", "No loyalty cards yet" in body and "0/7" not in body and "Joined" not in body)
    page.screenshot(path="/tmp/c6_empty.png")
    browser.close()

real = [e for e in errors if not re.search(r"realtime|websocket|Failed to load resource|ERR_INTERNET_DISCONNECTED", e, re.I)]
check("no unexpected console/page errors", not real, "; ".join(real)[:300])
print(f"\n{sum(r[1] for r in results)}/{len(results)} checks passed")
sys.exit(0 if all(r[1] for r in results) else 1)
