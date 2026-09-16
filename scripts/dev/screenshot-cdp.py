#!/usr/bin/env python3
"""Screenshot via CDP langsung (bypass harness) — dipakai karena capture_screenshot()
browser_exec kadang timeout di environment ini.

Pakai: python3 cdp_shot.py <out.png> [width] [height] [url_substring]
"""
import asyncio
import base64
import json
import sys
import urllib.request

import websockets

PORT = 9222


def targets():
    with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json/list', timeout=5) as r:
        return json.load(r)


async def shot(out, width, height, match):
    pages = [t for t in targets() if t.get('type') == 'page']
    if match:
        pages = [t for t in pages if match in t.get('url', '')] or pages
    page = pages[0]
    ws_url = page['webSocketDebuggerUrl']
    async with websockets.connect(ws_url, max_size=64 * 1024 * 1024, open_timeout=10) as ws:
        msg_id = 0

        async def send(method, params=None):
            nonlocal msg_id
            msg_id += 1
            await ws.send(json.dumps({'id': msg_id, 'method': method, 'params': params or {}}))
            while True:
                data = json.loads(await asyncio.wait_for(ws.recv(), timeout=25))
                if data.get('id') == msg_id:
                    if 'error' in data:
                        raise RuntimeError(data['error'])
                    return data.get('result', {})

        await send('Emulation.setDeviceMetricsOverride',
                   {'width': width, 'height': height, 'deviceScaleFactor': 1, 'mobile': width < 700})
        await asyncio.sleep(1.2)
        res = await send('Page.captureScreenshot',
                         {'format': 'png', 'captureBeyondViewport': False, 'optimizeForSpeed': True})
        open(out, 'wb').write(base64.b64decode(res['data']))
        print('ok', out, page['url'][:70])


if __name__ == '__main__':
    out = sys.argv[1]
    w = int(sys.argv[2]) if len(sys.argv) > 2 else 1180
    h = int(sys.argv[3]) if len(sys.argv) > 3 else 860
    m = sys.argv[4] if len(sys.argv) > 4 else '8893'
    asyncio.run(shot(out, w, h, m))
