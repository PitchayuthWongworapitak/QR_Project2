require("dotenv").config;
const config = require('./config');
const express = require("express");
const path = require("path");
const crc = require("crc");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const PORT = 3000;

console.log(config.keys.url, config.keys.publishable); // For Database!

const supabase = createClient(
    config.keys.url,
    config.keys.publishable,
);

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

const sessions = {};
function shallowEqual(a, b) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(key => a[key] === b[key]);
}


function getFormattedDate() {
    const date = new Date();

    const pad = (n, digits = 2) =>
        String(n).padStart(digits, "0");

    const offset = -date.getTimezoneOffset();
    const sign = offset >= 0 ? "+" : "-";
    const timezone =
        `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;

    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
        `.${pad(date.getMilliseconds(), 3)}000${timezone}`
    );
}

function getFormattedDate2() {
    const date = new Date();
    const pad = n => String(n).padStart(2, "0");

    return (
        date.getFullYear() +
        pad(date.getMonth() + 1) +
        pad(date.getDate()) +
        pad(date.getHours()) +
        pad(date.getMinutes()) +
        pad(date.getSeconds())
    );
}


app.post("/api/create", async (req, res) => {
    let code;
    let checkSum;
    let INFO;
    do {
        checkSum = crc.crc16ccitt(req.body.string || "").toString(16).toUpperCase().padStart(4, "0");
        code = (req.body.string || "") + checkSum;
        INFO = req.body.info;
    } while (sessions[code]);

    const { data, error } = await supabase.from("QRCode").insert({
        qrString: code,
        expiredAt: INFO.ExpDate,
        amount: INFO.Amount,
        status: "Pending"
    })

    if (error) {
        console.error(error);
    } else {
        console.log(data);
    }

    sessions[code] = {
        matched: false,
        name: null,
        info: INFO
    };

    console.log(`Created session for code: ${code}`);

    res.json({
        code: code
    });
})

app.post("/api/submit", async (req, res) => {
    const code = req.body;
    const database = await supabase.from("QRCode")

    const alreadyScanned = await database.select("*").eq("qrString", code).single();
    if (alreadyScanned.data && alreadyScanned.data.status === "Paid") {
        res.json({ success: false, message: "Code has already been used" });
        return;
    }

    const { data, error } = await database.update({ status: "Paid" }).eq("qrString", code);
    if (error) {
        console.error(error);
        res.json({ success: false, message: "Database error" });
        return;
    }
    if (sessions[code]) {
        sessions[code].matched = true;
        sessions[code].name = name || null;
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Invalid code" });
    }
});
app.post("/api/credit-info", async (req, res) => {
    const code = req.body.theCode;
    console.log(code);
    const creditInfo = req.body.mainInfo;

    const database = await supabase.from("QRCode")

    console.log("Sent credit info:", creditInfo);

    const alreadyScanned = await database.select("*").eq("qrString", code).single();
    if (alreadyScanned.data && alreadyScanned.data.status === "Paid") {
        console.log("Code has already been used!");
        res.json({ success: false, message: "Code has already been used" });
        return;
    }

    const { data, error } = await database.update({ status: "Paid" }).eq("qrString", code);
    console.log("Database update result:", data, error);
    if (error) {
        console.error(error);
        res.json({ success: false, message: "Database error" });
        return;
    }
    let successMsg = creditInfo.ResultDesc;
    let successCode = successMsg === "Successful" ? "0000" : "9999";
    // const jsonResponse = {
    //     ResCode: successCode,
    //     ResDesc: successMsg,
    //     TransDate: "" + new Date().toISOString().replace(/[-:]/g, "").split(".")[0],
    // }
    if (sessions[code]) {
        sessions[code].matched = true;
        successMsg = "Successful";
        successCode = "0000";
    }
    else {
        successMsg = "Failure";
        successCode = "9999";
    }
    res.json({ ResCode: successCode, ResDesc: successMsg, TransDate: "" + new Date().toISOString().replace(/[-:]/g, "").split(".")[0] })

})
app.get("/api/status/:code", async (req, res) => {
    const code = req.params.code;
    // Hi
    // console.log(`Checking status for code: ${code}`);
    const isMatched = await supabase.from("QRCode").select("*").eq("qrString", code).single();
    if (isMatched.data && isMatched.data.status === "Paid") {
        res.json({ matched: true, name: isMatched.data.name || null });
        return;
    }
    res.json({
        matched: sessions[code] ? sessions[code].matched : false,
        name: sessions[code] ? sessions[code].name : null
    });
});

app.get("/api/sessions", (req, res) => {
    res.json(sessions);
});

app.get("/api/check-existence/", async (req, res) => {
    const code = req.params.code;
    const isMatched = await supabase.from("QRCode").select("*").eq("qrString", code).single();
    if (isMatched.data && isMatched.data.status === "Paid") {
        res.json({ exists: true });
        return;
    }
    res.json({ exists: false });
});

app.post("/api/test-outside-URL", async (req, res) => {
    const { url } = req.body; // Get the URL from the request body
    const response = await fetch(url);
    const data = await response.json();
    
    console.log("Test Outside URL Response:", data);
    // Add your logic here to test the outside URL
});

app.post("/api/hello-world", (req, res) => {
    console.log(req.body);
    const senderName = `${req.body.firstName || "World"} ${req.body.lastName || ""}`.trim();
    console.log(`Received request from: ${senderName}`);
    res.json({ message: `Hello, ${senderName}!`});
});

app.post("/api/credit-notification", (req, res) => {
    let responseCode = "0000";
    let responseDesc = "Successful";
    const creditInfo = req.body;
    console.log("Received credit notification:", creditInfo);

    if (!creditInfo.Ref1 || !creditInfo.Ref2 || !creditInfo.BillerNo || !creditInfo.Amount || !creditInfo.InstructionId) {
        responseCode = "0001";
        responseDesc = "Invalid Input";
    }
    if (creditInfo.BillerNo.length !== 15) {
        responseCode = "0003";
        responseDesc = "Invalid BillerNo";
    }

    res.set({
        "Content-Type": "application/json; charset=UTF-8",
        "Service-Name":"credit-notification",
        "Request-Datetime": getFormattedDate(),
    })

    res.json({
        InstructionId: creditInfo.InstructionId,
        ResCode: responseCode,
        ResDesc: responseDesc,
        TransDate: getFormattedDate2(),
    });


});

app.post("/api/test-outside-URL", async (req, res) => {
    const { url } = req.body;
    const response = await fetch(url);
    const data = await response.json();
    
    console.log("Test Outside URL Response:", data);
    res.json({ success: true, data: data });
});

app.listen(PORT, () => {
    console.log(`Server is running!!`);
    console.log(`http://localhost:${PORT}`);
})
