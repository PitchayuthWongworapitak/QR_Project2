let theMap;
let theCode;

function domReady(fn) {
    if (
        document.readyState === "complete" ||
        document.readyState === "interactive"
    ) {
        setTimeout(fn, 1000);
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

function readQRString(qrString, isSub = false) {
    if (qrString === undefined) {
        qrString = document.getElementById("qr-string").value;
    }

    if (qrString === "") {
        qrString = "00020101021230770016A00000067701011201150107537000017160220ABCD1234567890XXXXXX0310222222222253037645406199.785802TH5903ABC62240720ZXXXE231231235900001630463CF";

        // 00020101021230660016A000000677010112001150115553016524510210ABCDE1234503082026072053037645406300.005802TH5904CHEN6207ZABCE27052600000000163041DD3
    }

    let details = new Map();
    let number = 0;

    while (number < qrString.length) {
        const key = qrString.substring(number, number + 2);
        const length = parseInt(qrString.substring(number + 2, number + 4));
        const value = qrString.substring(number + 4, number + 4 + length);
        details.set(key, value);
        //console.log(`Key: ${key}, Length: ${length}, Value: ${value}`);
        number += 4 + length;
    }

    if (details.has("30")) {
        details.set("30", readQRString(details.get("30"), true));
    }

    if (details.has("62")) {
        details.set("62", readQRString(details.get("62"), true));
    }
    // if (details.has("31")) {
    //     details.set("31", readQRString(details.get("31"), true));
    // }
    if (!isSub) {
        document.getElementById("result").innerHTML = buildTable(createAPIBody(details));
    }

    console.log(mapToJson(details));

    theCode = qrString;
    return details;
}

function buildTable(details) {
    let html = `<table>
          <thead>
            <tr><th>Tag</th><th>Value</th></tr>
          </thead>
          <tbody>`;

    for (let key in details) {
        const value = details[key];
        html += `<tr>
              <td class="key-cell">${key}</td>
              <td>${value}</td>
            </tr>`;
    }

    html += `</tbody></table>`;
    return html;
}

function mapToJson(map) {
    function replacer(value) {
        if (value instanceof Map) {
            return Object.fromEntries(Array.from(value.entries(), ([k, v]) => [k, replacer(v)]));
        }
        return value;
    }
    return replacer(map);
}

function formatDateTime(date = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");

    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);   // months are 0-indexed
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mi = pad(date.getMinutes());
    const ss = pad(date.getSeconds());

    return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

function createAPIBody(map) {
    const body = {};
    body["BillerNo"] = map.get("30")?.get("00");
    body["Ref1"] = map.get("30")?.get("01");
    body["Ref2"] = map.get("30")?.get("02");
    body["QRId"] = map.get("62").get("07")
    body["Amount"] = map.get("54");
    body["ResultCode"] = "000";
    body["ResultDesc"] = "Successful";
    body["TransDate"] = formatDateTime(new Date());
    return body;
}

async function creditNotification(map) {
    const body = createAPIBody(map);
    const response = await fetch("/api/credit-info", {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "Service-Name": "credit-notification",
            "Request-Datetime": new Date().toISOString().replace(/[-:]/g, "").split(".")[0],
        },
        body: JSON.stringify({theCode: theCode, mainInfo: body})
    });
    const data = await response.json();
    console.log(JSON.stringify(data));
}

async function submitInfo() {

}
domReady(function () {

    // If found you qr code
    function onScanSuccess(decodeText, decodeResult) {
        alert("You Qr is : " + decodeText, decodeResult);
        document.getElementById("qr-string").value = decodeText;
        theMap = readQRString(decodeText);
        document.getElementById("payButton").innerHTML = `<button onClick="creditNotification(theMap)">Pay</button>`
        //creditNotification(theMap);
    }

    let htmlscanner = new Html5QrcodeScanner(
        "my-qr-reader",
        { fps: 10, qrbos: 250 }
    );
    htmlscanner.render(onScanSuccess);
});