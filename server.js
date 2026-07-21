const express = require("express");
const path = require("path");
const crc = require("crc");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

const sessions = {};

app.post("/api/create", (req, res) => {
    let code;
    let checkSum;
    do {
        checkSum = crc.crc16ccitt(req.body.string || "").toString(16).toUpperCase().padStart(4, "0");
        code = (req.body.string || "") + checkSum;
    } while (sessions[code]);

    sessions[code] = {
        matched: false,
        name: null
    };

    console.log(`Created session for code: ${code}`);

    res.json({
        code: code
    });
})

app.post("/api/submit", (req, res) => {
    const {code, name} = req.body;
    if (sessions[code]) {
        sessions[code].matched = true;
        sessions[code].name = name || null;
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Invalid code" });
    }
});

app.get("/api/status/:code", (req, res) => {
    const code = req.params.code?.toUpperCase();

    // Hi
    // console.log(`Checking status for code: ${code}`);
    res.json({
        matched: sessions[code] ? sessions[code].matched : false,
        name: sessions[code] ? sessions[code].name : null
    });
});

app.get("/api/sessions", (req, res) => {
    res.json(sessions);
});

app.listen(PORT, () => {
    console.log(`Server is running!!`);
    console.log(`http://localhost:${PORT}`);
})
