const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        rollNo: {
            type: String,
            required: [true, 'Roll number is required'],
            unique: true,
            trim: true,
            uppercase: true,
        },
        roomNo: {
            type: String,
            required: [true, 'Room number is required'],
            trim: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: 6,
        },
        pushEnabled: {
            type: Boolean,
            default: false,
        },
        pushTokens: [
            {
                token: { type: String, required: true },
                device: { type: String, default: 'unknown' },
                createdAt: { type: Date, default: Date.now },
                lastSeenAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

// Hash password before save (Mongoose 7+: async hooks must NOT call next)
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
