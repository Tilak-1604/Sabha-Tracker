require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/auth');
const attendanceRoutes = require('./src/routes/attendance');
const dashboardRoutes = require('./src/routes/dashboard');
const leaveRoutes = require('./src/routes/leave');
const cheshtaRoutes = require('./src/routes/cheshta');
const pushRoutes = require('./src/routes/push');
const { startReminderScheduler } = require('./src/jobs/scheduler');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/cheshta', cheshtaRoutes);
app.use('/api/push', pushRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Hostel Sabha Tracker API is running' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Start nightly FCM reminder cron (22:15 IST)
    startReminderScheduler();
});
