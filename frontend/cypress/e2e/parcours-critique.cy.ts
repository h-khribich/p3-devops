/* eslint-disable @typescript-eslint/no-unused-expressions */

/**
 
 * Prérequis d'infrastructure (lancés automatiquement par scripts/run-e2e.sh) :
    - PostgreSQL sur localhost:5433 (datashare_e2e)
    - MinIO sur localhost:9000 (bucket datashare-e2e)
    - Backend NestJS sur http://localhost:3000
    - Frontend Vite sur http://localhost:5173
 
  Aucun mock : l'application, la BDD et S3 (MinIO) sont réels.
 
  Chaque test est indépendant : il crée ses propres données via API
  (inscription + upload) pour ne pas dépendre d'un test précédent.
 
 */

describe("Parcours critique E2E", () => {
  const email = `e2e-${Date.now()}@test.com`;
  const password = "TestPass123!";

  // ── Inscription via API pour préparer les tests suivants ──
  before(() => {
    cy.request({
      method: "POST",
      url: "http://localhost:3000/auth/register",
      body: { email, password },
      failOnStatusCode: false,
    });
  });

  it("1. Inscription — Remplir et soumettre le formulaire", () => {
    const newEmail = `e2e-register-${Date.now()}@test.com`;

    cy.visit("/register");

    cy.get('[data-cy="register-form"]').should("be.visible");
    cy.get('[data-cy="register-email"]').should("be.visible");
    cy.get('[data-cy="register-password"]').should("be.visible");
    cy.get('[data-cy="register-confirm-password"]').should("be.visible");

    cy.get('[data-cy="register-email"]').type(newEmail);
    cy.get('[data-cy="register-password"]').type(password);
    cy.get('[data-cy="register-confirm-password"]').type(password);

    cy.get('[data-cy="register-submit"]').click();

    cy.url({ timeout: 10000 }).should("include", "/login");
    cy.get('[data-cy="login-form"]', { timeout: 10000 }).should("be.visible");
  });

  it("2. Connexion — Se connecter avec le compte créé", () => {
    cy.visit("/login");

    cy.get('[data-cy="login-form"]').should("be.visible");
    cy.get('[data-cy="login-email"]').type(email);
    cy.get('[data-cy="login-password"]').type(password);

    cy.intercept("POST", "http://localhost:3000/auth/login").as("loginRequest");

    cy.get('[data-cy="login-submit"]').click();

    cy.wait("@loginRequest").then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
      expect(interception.response?.body).to.have.property("access_token");
    });

    cy.url({ timeout: 10000 }).should("include", "/my-space");

    cy.window()
      .its("localStorage")
      .invoke("getItem", "access_token")
      .should("exist");
  });

  it("3. Upload — Envoyer un fichier JPEG depuis l'interface", () => {
    cy.visit("/login");
    cy.get('[data-cy="login-email"]').type(email);
    cy.get('[data-cy="login-password"]').type(password);
    cy.get('[data-cy="login-submit"]').click();
    cy.url({ timeout: 10000 }).should("include", "/my-space");

    cy.visit("/upload");

    cy.get('[data-cy="upload-form"]').should("be.visible");
    cy.get('[data-cy="upload-file-input"]').should("exist");

    cy.intercept("POST", "http://localhost:3000/uploads/me").as(
      "uploadRequest",
    );

    cy.get('[data-cy="upload-file-input"]').attachFile("test-image.jpg");
    cy.contains("test-image.jpg").should("be.visible");

    cy.get('[data-cy="upload-submit"]').click();

    cy.wait("@uploadRequest").then((interception) => {
      expect(interception.response?.statusCode).to.eq(201);
      expect(interception.response?.body).to.have.property("downloadPath");
      expect(interception.response?.body).to.have.property("filename");
      expect(interception.response?.body).to.have.property("size");
    });

    cy.contains("Félicitations").should("be.visible");
  });

  it("4. Téléchargement — Accéder à la page et télécharger le fichier", () => {
    // Étape 1 : uploader un fichier via l'API pour obtenir un downloadPath
    cy.loginApi(email, password).then((token) => {
      cy.uploadFileViaApi("test-image.jpg", token).then((body) => {
        const downloadPath = body.downloadPath;

        // Étape 2 : visiter la page de téléchargement
        cy.visit(downloadPath);

        cy.get('[data-cy="download-form"]').should("be.visible");
        cy.contains("test-image.jpg").should("be.visible");
        cy.get('[data-cy="download-submit"]')
          .should("be.visible")
          .and("not.be.disabled");

        cy.intercept("POST", "http://localhost:3000/downloads/**/file").as(
          "downloadFileRequest",
        );

        cy.get('[data-cy="download-submit"]').click();

        cy.wait("@downloadFileRequest").then((interception) => {
          expect(interception.response?.statusCode).to.eq(200);
        });
      });
    });
  });

  it("5. Espace personnel — Vérifier la présence du fichier dans la liste", () => {
    // Uploader un fichier via API en amont
    cy.loginApi(email, password).then((token) => {
      cy.uploadFileViaApi("test-image.jpg", token).then(() => {
        // Maintenant on va sur l'espace personnel
        cy.visit("/login");
        cy.get('[data-cy="login-email"]').type(email);
        cy.get('[data-cy="login-password"]').type(password);
        cy.get('[data-cy="login-submit"]').click();
        cy.url({ timeout: 10000 }).should("include", "/my-space");

        cy.get('[data-cy="file-list"]').should("be.visible");
        cy.get('[data-cy="file-item"]').should("have.length.at.least", 1);
        cy.contains("test-image.jpg").should("be.visible");
      });
    });
  });
});
/* eslint-enable @typescript-eslint/no-unused-expressions */
