const app = require("./src/app");
const dotenv = require("dotenv").config()
const connectDB = require("./src/db/db");

// Establish connection to MongoDB
connectDB();

app.listen(process.env.PORT, () => {
    console.log(`🚀 Core Server processing framework live on port: ${process.env.PORT}`);
    console.log(`📡 Ready to execute UPSC AI handshakes at: http://localhost:${process.env.PORT}/api/ai/generate-material`);
})