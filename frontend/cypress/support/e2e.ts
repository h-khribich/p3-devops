import "cypress-file-upload";
import "@cypress/code-coverage/support";

/**
 * Commande Cypress personnalisée pour se connecter via l'API.
 * Retourne le token JWT pour l'utiliser dans des requêtes API后续.
 */
Cypress.Commands.add("loginApi", (email: string, password: string) => {
  return cy
    .request({
      method: "POST",
      url: "http://localhost:3000/auth/login",
      body: { email, password },
    })
    .then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property("access_token");
      return response.body.access_token;
    });
});

/**
 * Commande Cypress personnalisée pour uploader un fichier via l'API.
 * Utilise une requête fetch native (via cy.window()) pour gérer correctement
 * le multipart/form-data, là où cy.request() ne le gère pas.
 *
 * @param fileName - Nom du fichier dans le dossier fixtures (ex: "test-image.jpg")
 * @param accessToken - Token JWT pour l'authentification
 * @returns Le body de la réponse de l'API (downloadPath, filename, size, etc.)
 */
Cypress.Commands.add(
  "uploadFileViaApi",
  (fileName: string, accessToken: string) => {
    return cy.fixture(fileName, "base64").then((base64Content) => {
      // Convertir le base64 en blob via l'interface Blob du navigateur
      return cy.window().then((win) => {
        const byteCharacters = atob(base64Content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/jpeg" });

        const formData = new FormData();
        formData.append("file", blob, fileName);
        formData.append("expirationDays", "7");

        return cy.wrap(
          win
            .fetch("http://localhost:3000/uploads/me", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              body: formData,
            })
            .then((res: Response) => {
              if (!res.ok) {
                throw new Error(
                  `Upload API error: ${res.status} ${res.statusText}`,
                );
              }
              return res.json();
            }),
        );
      });
    });
  },
);
