declare namespace Cypress {
  interface Chainable<Subject = any> {
    /**
     * Commande personnalisée pour se connecter via l'API.
     * Retourne le token JWT.
     * @param email - Email de l'utilisateur
     * @param password - Mot de passe
     */
    loginApi(email: string, password: string): Chainable<string>;

    /**
     * Commande personnalisée pour uploader un fichier via l'API.
     * Retourne le body de la réponse.
     * @param fileName - Nom du fichier dans le dossier fixtures
     * @param accessToken - Token JWT
     */
    uploadFileViaApi(fileName: string, accessToken: string): Chainable<any>;
  }
}
