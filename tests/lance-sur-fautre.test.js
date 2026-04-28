import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(process.cwd());
const SITE_DATA_PATH = path.join(ROOT, "dist", "site-data.json");
const CONVERSATIONS_DIR = path.join(ROOT, "dist", "conversations");

describe("fusion des conversations", () => {
  it("publie les categories thematiques attendues", async () => {
    const siteData = JSON.parse(await readFile(SITE_DATA_PATH, "utf8"));
    expect(siteData.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: "materiel", title: "Matériel" }),
        expect.objectContaining({ slug: "stages-et-evenements", title: "Stages et évènements" }),
        expect.objectContaining({ slug: "associations-et-communaute", title: "Associations et communauté" }),
        expect.objectContaining({ slug: "transcriptions-et-traductions", title: "Transcriptions et traductions" }),
        expect.objectContaining({ slug: "ressource", title: "Ressource" }),
      ]),
    );
  });

  it("ne conserve qu'une seule conversation listee pour lance sur fautre", async () => {
    const siteData = JSON.parse(await readFile(SITE_DATA_PATH, "utf8"));

    const mergedEntries = siteData.autoSpaceMergedConversations.filter(
      (conversation) => conversation.title === "[lance sur fautre]",
    );

    expect(mergedEntries).toHaveLength(1);
    expect(mergedEntries[0]).toMatchObject({
      mergedTitle: "[lance sur fautre]",
      messages: 2,
    });
    expect(mergedEntries[0].firstDate).toBe("2004-01-30T12:41:11.000Z");
  });

  it("fusionne les deux conversations i33 de septembre 2004 en une seule page", async () => {
    const siteData = JSON.parse(await readFile(SITE_DATA_PATH, "utf8"));
    const files = await readdir(CONVERSATIONS_DIR);
    const i33Files = files.filter(
      (file) => file === "2004-09-08-i33.html" || file === "2004-09-20-i33.html",
    );

    expect(i33Files).toEqual(["2004-09-08-i33.html"]);
    expect(siteData.listedConversations).toBe(554);
  });

  it("fusionne les conversations retour de flamme de 2004", async () => {
    const files = await readdir(CONVERSATIONS_DIR);
    const retourFiles = files.filter(
      (file) =>
        file === "2004-08-31-retour-de-flamme.html" ||
        file === "2004-08-31-retour-sur-flammes.html",
    );

    expect(retourFiles).toEqual(["2004-08-31-retour-sur-flammes.html"]);
  });

  it("fusionne les conversations stage equitation xii s de 2004", async () => {
    const files = await readdir(CONVERSATIONS_DIR);
    const stageFiles = files.filter(
      (file) =>
        file === "2004-10-14-stage-equitation-xii-s.html" ||
        file === "2004-10-26-stage-equitation-xii-s.html",
    );

    expect(stageFiles).toEqual(["2004-10-14-stage-equitation-xii-s.html"]);
  });

  it("ne conserve qu'une seule conversation retour de flammes dans le sommaire", async () => {
    const files = await readdir(CONVERSATIONS_DIR);
    const retourFiles = files.filter(
      (file) =>
        file === "2004-08-31-retour-de-flamme.html" ||
        file === "2004-08-31-retour-sur-flammes.html",
    );

    expect(retourFiles).toHaveLength(1);
  });

  it("fusionne le message du 15 septembre 2004 dans Escrime mÃ©diÃ©vale ou artistique Info", async () => {
    const files = await readdir(CONVERSATIONS_DIR);
    const infoFiles = files.filter(
      (file) =>
        file === "2004-09-04-escrime-medievale-ou-artistique-info.html" ||
        file === "2004-09-15-escrime-medie-vale.html",
    );

    expect(infoFiles).toEqual(["2004-09-04-escrime-medievale-ou-artistique-info.html"]);
  });

  it("fusionne les deux conversations des hordes hurlantes de chevaliers deferlent", async () => {
    const files = await readdir(CONVERSATIONS_DIR);
    const hordesFiles = files.filter(
      (file) =>
        file === "2009-05-09-des-hordes-hurlantes-de-chevaliers-deferlent.html" ||
        file === "2009-05-11-des-hordes-hurlantes-de-chevaliers-deferlent.html",
    );

    expect(hordesFiles).toEqual(["2009-05-09-des-hordes-hurlantes-de-chevaliers-deferlent.html"]);
  });

  it("separe Langen Ort de commande collective et fusionne les messages de fevrier 2005", async () => {
    const files = await readdir(CONVERSATIONS_DIR);
    expect(files).toContain("2005-02-19-commande-collective.html");
    expect(files).toContain("2005-02-21-langen-ort.html");

    const commandeCollective = await readFile(
      path.join(CONVERSATIONS_DIR, "2005-02-19-commande-collective.html"),
      "utf8",
    );
    const langenOrt = await readFile(
      path.join(CONVERSATIONS_DIR, "2005-02-21-langen-ort.html"),
      "utf8",
    );

    expect(commandeCollective).not.toContain("<h2>Langen Ort</h2>");
    expect(langenOrt).toContain("<h1>Langen Ort</h1>");
  });
});
