"""Read-only local preview with byte-range support for MP3 seeking."""
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import argparse,os,re
ROOT=Path(__file__).resolve().parents[2]
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def end_headers(self):
        self.send_header('Accept-Ranges','bytes')
        super().end_headers()
    def send_head(self):
        self.range_remaining=None
        request=self.headers.get('Range')
        target=Path(self.translate_path(self.path))
        if not request or not target.is_file():return super().send_head()
        size=target.stat().st_size
        match=re.fullmatch(r'bytes=(\d*)-(\d*)',request)
        if not match:return super().send_head()
        first,last=match.groups()
        if first:start=int(first);end=min(int(last) if last else size-1,size-1)
        else:start=max(0,size-int(last or 0));end=size-1
        if start>=size or start>end:
            self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.send_header('Content-Length','0');self.end_headers();return None
        file=target.open('rb');file.seek(start);self.range_remaining=end-start+1
        self.send_response(206);self.send_header('Content-Type',self.guess_type(str(target)));self.send_header('Content-Range',f'bytes {start}-{end}/{size}');self.send_header('Content-Length',str(self.range_remaining));self.end_headers();return file
    def copyfile(self,source,outputfile):
        try:
            if self.range_remaining is None:return super().copyfile(source,outputfile)
            while self.range_remaining>0:
                chunk=source.read(min(65536,self.range_remaining))
                if not chunk:break
                outputfile.write(chunk);self.range_remaining-=len(chunk)
        except (BrokenPipeError,ConnectionResetError):pass
    def log_message(self,*args):pass
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8788);args=parser.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    print(f'http://127.0.0.1:{args.port}/visualizer/',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:server.server_close()
