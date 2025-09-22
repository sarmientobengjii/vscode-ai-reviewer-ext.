"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const aiCodeAnalyzer_1 = require("./aiCodeAnalyzer");
function activate(context) {
    console.log('Hello Master, what can I do for you?');
    const analyzer = new aiCodeAnalyzer_1.AICodeAnalyzer();
}
//# sourceMappingURL=extension.js.map