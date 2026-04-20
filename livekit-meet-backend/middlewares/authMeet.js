// middlewares/authMeet.js
// Middleware sans compte utilisateur.
// Valide que displayName et roomName sont présents et corrects.
// Pas de login, pas de mot de passe — comme Google Meet.

module.exports.authMeet = (req, res, next) => {
  const { displayName, roomName } = req.body;

  // Valider le nom d'affichage
  if (!displayName || typeof displayName !== "string" || displayName.trim().length < 2) {
    return res.status(400).json({
      error: "displayName invalide",
      detail: "Le nom d'affichage doit contenir au moins 2 caractères",
    });
  }

  // Valider le nom de room (sauf pour /create qui peut l'auto-générer)
  if (roomName !== undefined) {
    if (typeof roomName !== "string" || roomName.trim().length < 3) {
      return res.status(400).json({
        error: "roomName invalide",
        detail: "Le nom de réunion doit contenir au moins 3 caractères",
      });
    }
  }

  // Normaliser et attacher à la requête
  req.meetUser = {
    displayName: displayName.trim(),
    // Normalise : minuscules, espaces → tirets, caractères spéciaux retirés
    roomName: roomName
      ? roomName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      : null,
  };

  next();
};
