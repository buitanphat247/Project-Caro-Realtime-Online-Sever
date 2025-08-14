const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors()); // Cho phép truy cập từ domain khác (React frontend)

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // Khi deploy hãy đổi sang domain thật
        methods: ["GET", "POST"]
    }
});

// Lưu thông tin phòng
const rooms = {};
function checkWin(board, x, y, symbol) {
    const SIZE = board.length;
    const directions = [
        [1, 0],  // ngang
        [0, 1],  // dọc
        [1, 1],  // chéo chính
        [1, -1], // chéo phụ
    ];

    for (const [dx, dy] of directions) {
        let count = 1;

        for (let dir = -1; dir <= 1; dir += 2) {
            let i = 1;
            while (true) {
                const nx = x + dx * i * dir;
                const ny = y + dy * i * dir;

                if (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE && board[nx][ny] === symbol) {
                    count++;
                    i++;
                } else {
                    break;
                }
            }
        }

        if (count >= 5) return true;
    }

    return false;
}

io.on("connection", (socket) => {
    console.log("User connected: " + socket.id);

    socket.on("createRoom", (callback) => {
        const roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
        rooms[roomId] = {
            players: [socket.id],
            board: Array(15).fill(null).map(() => Array(15).fill(null)),
        };
        socket.join(roomId);
        callback(roomId);
        console.log(`Room created: ${roomId}`);
    });

    socket.on("joinRoom", (roomId, callback) => {
        socket.join(roomId);
        const room = io.sockets.adapter.rooms.get(roomId);
        console.log(`🔗 Người chơi ${socket.id} đã join phòng ${roomId}. Số người trong phòng: ${room.size}`);
        if (room.size === 2) {
            io.to(roomId).emit("playersReady"); // gửi tới cả 2 người chơi
        }
        callback({ success: true });
    });

    socket.on("makeMove", ({ roomId, x, y, symbol, playerName }) => {
        // Lấy thông tin phòng từ biến rooms
        const room = rooms[roomId];
        // Nếu phòng không tồn tại hoặc ô đã có quân thì bỏ qua
        if (!room || room.board[x][y]) return;
        // 1. Cập nhật bàn cờ với nước đi mới của người chơi
        room.board[x][y] = symbol;
        // 2. Gửi nước đi cho tất cả client trong phòng để cập nhật giao diện
        io.to(roomId).emit("moveMade", {
            x,
            y,
            symbol,
            nextTurn: room.currentTurn // lượt hiện tại (chưa cập nhật)
        });
        // 3. Kiểm tra xem nước đi vừa rồi có thắng không
        if (checkWin(room.board, x, y, symbol)) {
            // Nếu thắng, gửi thông báo kết thúc game kèm tên người thắng về client
            io.to(roomId).emit("gameOver", { winner: symbol, winnerName: playerName });
            return; // Kết thúc xử lý, không cần gửi moveMade tiếp theo
        }
        // 4. Nếu chưa thắng, cập nhật lượt tiếp theo cho phòng
        room.currentTurn = symbol === "X" ? "O" : "X";
        // 5. Gửi lại nước đi cho client với lượt mới (dòng này thực ra bị dư, chỉ cần gửi moveMade 1 lần ở trên là đủ)
        io.to(roomId).emit("moveMade", {
            x,
            y,
            symbol,
            nextTurn: room.currentTurn
        });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected: " + socket.id);
        for (const roomId in rooms) {
            const room = rooms[roomId];
            if (room.players.includes(socket.id)) {
                io.to(roomId).emit("playerLeft");
                delete rooms[roomId];
                break;
            }
        }
    });
});

server.listen(3001, () => {
    console.log("Server is running on port 3001");
});
