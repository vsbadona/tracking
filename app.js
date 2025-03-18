// backend/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log(err));

// User schema
const userSchema = new mongoose.Schema({
    socketId: String,
    latitude: Number,
    longitude: Number,
});

const User = mongoose.model("User ", userSchema); // Fixed model name by removing extra space

io.on("connection", (socket) => {
    console.log("User  connected: " + socket.id);

    socket.on("send-location", async (location) => {
        // Update or create user location in the database
        await User.findOneAndUpdate(
            { socketId: socket.id },
            { latitude: location.latitude, longitude: location.longitude },
            { upsert: true }
        );

        // Broadcast the location to all other clients
        socket.broadcast.emit("receive-location", { id: socket.id, ...location });
    });

    socket.on("disconnect", async () => {
        console.log("User  disconnected: " + socket.id);
        await User.deleteOne({ socketId: socket.id });
        // Optionally, you can broadcast the disconnection event
        socket.broadcast.emit("user-disconnected", socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});