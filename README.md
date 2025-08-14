## Caro Realtime Online – Server

Dịch vụ backend realtime cho trò chơi Caro (Gomoku) 15x15, cho phép tạo/join phòng và chơi theo thời gian thực bằng Socket.IO.

### Công nghệ sử dụng
- **Node.js**: Runtime JavaScript phía server
- **Express 5**: Web framework để khởi tạo HTTP server
- **Socket.IO 4**: Giao tiếp realtime qua WebSocket/fallback
- **CORS**: Cho phép frontend khác origin kết nối
- **Nodemon** (dev): Tự động restart khi thay đổi mã nguồn

### Tính năng chính
- **Tạo phòng**: Sinh mã phòng ngẫu nhiên 6 ký tự
- **Tham gia phòng**: Người chơi thứ hai join để bắt đầu
- **Đánh cờ realtime**: Đồng bộ nước đi giữa các client trong phòng
- **Kiểm tra thắng**: Thắng khi có 5 quân liên tiếp (ngang/dọc/chéo)
- **Rời phòng**: Thông báo khi người chơi rời, dọn dẹp phòng

### Cấu trúc dự án (rút gọn)
- `index.js`: Điểm vào server (Express + Socket.IO)
- `package.json`: Thông tin dự án và scripts

### Yêu cầu hệ thống
- Node.js >= 16 (khuyến nghị LTS mới nhất)
- npm >= 8

### Cài đặt
```bash
npm install
```

### Chạy dự án
- Chế độ development (tự reload bằng Nodemon):
```bash
npm run dev
```

- Chế độ production (chạy trực tiếp Node):
```bash
node index.js
```

Mặc định server lắng nghe tại cổng `3001`. Bạn có thể đổi cổng trong `index.js` nếu cần.

### Cấu hình CORS khi triển khai
Trong `index.js`, CORS đang mở cho mọi origin để dễ phát triển:
```js
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
```
Khi triển khai, hãy thay `origin: "*"` bằng domain frontend thật để tăng bảo mật.

### Sự kiện Socket.IO đã hỗ trợ
- `connection`: Sự kiện mặc định khi client kết nối
- `createRoom` (client -> server): Tạo phòng mới
  - Trả về: `roomId` (string)
- `joinRoom` (client -> server): Tham gia phòng
  - Tham số: `roomId` (string)
  - Trả về: `{ success: true }`
  - Nếu đủ 2 người: server phát `playersReady` tới cả phòng
- `makeMove` (client -> server): Gửi nước đi
  - Tham số: `{ roomId, x, y, symbol, playerName }`
  - Server phát `moveMade` tới phòng và kiểm tra thắng
  - Nếu thắng, phát `gameOver` với `{ winner, winnerName }`
- `playersReady` (server -> clients): Cả hai người đã sẵn sàng
- `moveMade` (server -> clients): Nước đi mới và lượt tiếp theo
- `gameOver` (server -> clients): Trận đấu kết thúc
- `playerLeft` (server -> clients): Có người rời phòng
- `disconnect`: Client ngắt kết nối

### Ví dụ client tối giản (socket.io-client)
```bash
npm install socket.io-client
```
```js
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

// Tạo phòng
socket.emit("createRoom", (roomId) => {
  console.log("Room:", roomId);
});

// Join phòng
socket.emit("joinRoom", "ABC123", (res) => {
  console.log(res); // { success: true }
});

// Gửi nước đi
socket.emit("makeMove", { roomId: "ABC123", x: 7, y: 7, symbol: "X", playerName: "Alice" });

// Lắng nghe sự kiện
socket.on("playersReady", () => console.log("Ready!"));
socket.on("moveMade", (data) => console.log("Move:", data));
socket.on("gameOver", (data) => console.log("Winner:", data));
socket.on("playerLeft", () => console.log("Opponent left"));
```

### Ghi chú triển khai
- Mã phòng lưu trong bộ nhớ (`rooms` trong `index.js`), phù hợp demo/prototype. Với production, cân nhắc lưu trạng thái vào Redis/DB để scale và chống mất trạng thái khi restart.
- Thêm xác thực (token) nếu cần phân quyền hoặc lưu lịch sử trận.
- Thay đổi kiểm tra CORS trước khi public.

### Giấy phép
Mặc định `ISC` (xem `package.json`).
