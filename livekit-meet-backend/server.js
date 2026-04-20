// server.js
const app = require("./app");
const { PORT } = require("./config/env");

app.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║     LiveKit Meet Backend               ║");
  console.log(`║     Port  : ${PORT}                           ║`);
  console.log(`║     Mode  : ${process.env.NODE_ENV || "development"}                 ║`);
  console.log("╠═══════════════════════════════════════════╣");
  console.log("║  Endpoints disponibles :                  ║");
  console.log("║  POST /api/meet/create                    ║");
  console.log("║  POST /api/meet/join                      ║");
  console.log("║  GET  /api/meet/:room/info                ║");
  console.log("║  DELETE /api/meet/:room                   ║");
  console.log("║  POST /api/recording/start                ║");
  console.log("║  POST /api/recording/stop                 ║");
  console.log("║  GET  /api/recording/active/:room         ║");
  console.log("║  GET  /health                             ║");
  console.log("╚═══════════════════════════════════════════╝");
  console.log("");
});
