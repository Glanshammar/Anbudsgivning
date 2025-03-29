import zmq
import threading


class RouterServer:
    def __init__(self, address="tcp://*:5555"):
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.ROUTER)
        self.socket.bind(address)
        print(f"Router server bound to {address}")

        self.command_handlers = {
            b"add": self.add,
            b"sub": self.sub,
            b"echo": self.echo,
            b"upper": self.text_upper,
        }

    def add(self, a, b):
        return str(float(a) + float(b)).encode()

    def sub(self, a, b):
        return str(float(a) - float(b)).encode()

    def echo(self, message):
        return message
    
    def text_upper(self, text):
        return text.upper()

    def start(self):
        while True:
            frames = self.socket.recv_multipart()
            
            threading.Thread(
                target=self._process_request,
                args=(frames,),
                daemon=True
            ).start()

    def _process_request(self, frames):
        identity, _, command, *args = frames
        handler = self.command_handlers.get(command, lambda *x: b"Unknown command")
        response = handler(*args)
        self.socket.send_multipart([identity, b"", response])


class DealerClient:
    def __init__(self, client_id):
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.DEALER)
        self.socket.setsockopt(zmq.IDENTITY, client_id.encode())
        self.socket.connect("tcp://localhost:5555")

    def send_request(self, command, *args):
        self.socket.send_multipart([b"", command.encode()] + [arg.encode() for arg in args])
        return self.socket.recv_multipart()[-1].decode()


if __name__ == "__main__":
    server = RouterServer()
    server_thread = threading.Thread(target=server.start, daemon=True)
    server_thread.start()

    client_a = DealerClient("ClientA")
    client_b = DealerClient("ClientB")

    print("Client A Add:", client_a.send_request("add", "10", "5"))
    print("Client B Upper:", client_b.send_request("upper", "hello"))
    print("Unknown command:", client_a.send_request("invalid"))
    print("Echo:", client_b.send_request("echo", "Your mom!"))
