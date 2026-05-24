const express = require("express");
const verifyToken = require("../middlewares/auth");
const router = express.Router();

router.get("/:serviceType/:id",verifyToken, (req, res) => {
  const { serviceType, id } = req.params;

  const appSchemeUrl = `brahminmilan://${serviceType}-profile/${id}`;
  const fallbackUrl = "https://play.google.com/store/apps/details?id=com.brahminmilanbyappwin.app";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Opening Brahmin Milan...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script>
          // Try to open the app
          setTimeout(() => {
            window.location.href = "${appSchemeUrl}";
          }, 100);

          // Fallback to Play Store
          setTimeout(() => {
            window.location.href = "${fallbackUrl}";
          }, 2000);
        </script>
      </head>
      <body>
        <p style="text-align: center; margin-top: 30px;">
          Redirecting to Brahmin Milan App...
        </p>
      </body>
    </html>
  `;

  res.send(html);
});

module.exports = router;
