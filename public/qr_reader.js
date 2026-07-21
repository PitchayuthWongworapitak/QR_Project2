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
        console.log(`Key: ${key}, Length: ${length}, Value: ${value}`);
        number += 4 + length;
    }

    if (details.has("30")) {
        details.set("30", readQRString(details.get("30"), true));
    }
    // if (details.has("31")) {
    //     details.set("31", readQRString(details.get("31"), true));
    // }
    if (!isSub) {
        document.getElementById("result").innerHTML = buildTable(details);
    }

    console.log(details);

    return details;
}

function buildTable(details) {
    let html = `<table>
          <thead>
            <tr><th>Tag</th><th>Value</th></tr>
          </thead>
          <tbody>`;

   for (let [key, value] of details) {
        if (value instanceof Map) {
            html += `<tr>
              <td class="key-cell">${key}</td>
              <td>Nested data</td>
            </tr>
            <tr class="nested-row">
              <td colspan="2">${buildTable(value)}</td>
            </tr>`;
        } else {
            html += `<tr>
              <td class="key-cell">${key}</td>
              <td>${value}</td>
            </tr>`;
        }
    }

    html += `</tbody></table>`;
    return html;
}
domReady(function () {

    // If found you qr code
    function onScanSuccess(decodeText, decodeResult) {
        alert("You Qr is : " + decodeText, decodeResult);
        document.getElementById("qr-string").value = decodeText;
    }

    let htmlscanner = new Html5QrcodeScanner(
        "my-qr-reader",
        { fps: 10, qrbos: 250 }
    );
    htmlscanner.render(onScanSuccess);
});