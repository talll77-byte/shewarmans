/**
 * THE HUNGRY PISTOL - VERSION 5.0 (FINAL PRODUCTION)
 * Senior Architect: Strategic Validation & Industrial Summary
 */

const API_SECRET = "HP_SECURE_2024_!@#"; 
const COL = { TIMESTAMP: 0, NAME: 1, TYPE: 2, MEAT: 3, DRINK: 4, NOTE: 5 };
const TIMEZONE = "Asia/Jerusalem";

// רשימת עובדים מורשים לאימות (מבוסס על הנתונים שסיפקת)
const AUTHORIZED_EMPLOYEES = [
  { he: "רשיד באקייב", id: "10211" },
  { he: "טל לדיז'ינסקי", id: "10201" },
  { he: "סרגיי סופוניצקי", id: "100149" },
  { he: "אנדריי בייטין", id: "101088" },
  { he: "קרימר אלכסנדר", id: "10238" },
  { he: "קוסטיה אסקרוב", id: "10318" },
  { he: "אנג'ליקה פומזונובסקי", id: "10229" }
];

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    if (request.secret !== API_SECRET) return response({ success: false, error: "Unauthorized" });

    let result;
    switch (request.action) {
      case 'submitOrder': result = submitOrderLogic(request.data); break;
      case 'getSummary': result = getOrderSummaryLogic(); break;
      case 'getHistory': result = getEmployeeHistoryLogic(request.name); break;
      default: throw new Error("Invalid Action");
    }
    return response({ success: true, data: result });
  } catch (err) {
    return response({ success: false, error: err.toString() });
  }
}

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function submitOrderLogic(orderObj) {
  const cleanName = orderObj.name.trim();
  
  // אימות עובד: האם השם קיים ברשימה המורשית?
  const isAuthorized = AUTHORIZED_EMPLOYEES.some(e => e.he.toLowerCase() === cleanName.toLowerCase());
  if (!isAuthorized) return "❌ עובד לא מזוהה במערכת / Сотрудник не найден";

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  const todayStr = Utilities.formatDate(now, TIMEZONE, "dd/MM/yyyy");

  for (let i = data.length - 1; i >= 1; i--) {
    const rowDate = data[i][COL.TIMESTAMP];
    if (rowDate instanceof Date && Utilities.formatDate(rowDate, TIMEZONE, "dd/MM/yyyy") === todayStr) {
      if (data[i][COL.NAME].toString().toLowerCase() === cleanName.toLowerCase()) {
        sheet.getRange(i + 1, COL.TYPE + 1, 1, 4).setValues([[
          orderObj.type, orderObj.meat, orderObj.drink, orderObj.note || ""
        ]]);
        return "✅ עודכן בהצלחה! / Обновлено!";
      }
    }
  }
  sheet.appendRow([now, cleanName, orderObj.type, orderObj.meat, orderObj.drink, orderObj.note || ""]);
  return "🚀 הזמנה חדשה נקלטה! / Принято!";
}

function getOrderSummaryLogic() {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].getDataRange().getValues();
  const todayStr = Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy");
  
  const summary = {
    he: { raw: `*🍔 סיכום הזמנות - ${todayStr}*\\n-----------------------\\n`, count: 0 },
    ru: { raw: `*🍔 Сводка заказов - ${todayStr}*\\n-----------------------\\n`, count: 0 }
  };

  const stats = {};

  for (let i = 1; i < data.length; i++) {
    const rowDate = data[i][COL.TIMESTAMP];
    if (rowDate instanceof Date && Utilities.formatDate(rowDate, TIMEZONE, "dd/MM/yyyy") === todayStr) {
      const name = data[i][COL.NAME];
      const emp = AUTHORIZED_EMPLOYEES.find(e => e.he.toLowerCase() === name.toLowerCase()) || { id: "???" };
      const dish = `${data[i][COL.MEAT]} ב${data[i][COL.TYPE]}`;
      const note = data[i][COL.NOTE] ? ` [${data[i][COL.NOTE]}]` : "";
      
      summary.he.count++;
      summary.he.raw += `▪️ (${emp.id}) ${name}: ${dish}${note}\\n`;
      summary.ru.raw += `▪️ (${emp.id}) ${name}: ${dish}${note}\\n`;
      
      stats[dish] = (stats[dish] || 0) + 1;
    }
  }

  if (summary.he.count > 0) {
    summary.he.raw += `\\n📊 *סה"כ מנות:*\\n`;
    for (let key in stats) summary.he.raw += `• ${key}: ${stats[key]}\\n`;
  } else {
    return { he: { raw: "אין הזמנות להיום." }, ru: { raw: "Нет заказов на сегодня." } };
  }

  return summary;
}

function getEmployeeHistoryLogic(name) {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].getDataRange().getValues();
  const history = [];
  const cleanName = name.trim().toLowerCase();
  for (let i = data.length - 1; i >= 1 && history.length < 5; i--) {
    if (data[i][COL.NAME].toString().toLowerCase() === cleanName) {
      history.push({
        date: Utilities.formatDate(data[i][COL.TIMESTAMP], TIMEZONE, "dd/MM/yyyy"),
        order: `${data[i][COL.MEAT]} ב${data[i][COL.TYPE]}`,
        drink: data[i][COL.DRINK]
      });
    }
  }
  return history;
}
