import { describe, expect, it } from "vitest";
import { buildPublicData } from "../shared/public-data";
import { toPublicProfile } from "../shared/public-schemas";
import {
  makeAsset,
  makeGrant,
  makeIdea,
  makeItem,
  makePrivateSnapshot,
  makeProfile,
} from "./fixtures";

describe("public data allowlist", () => {
  it("exports only public items and drops private fields", () => {
    const snapshot = makePrivateSnapshot({
      items: [
        makeItem({ id: "item-public", visibility: "public" }),
        makeItem({
          id: "item-private",
          visibility: "private",
          publicUrl: "https://private.example.com/secret",
        }),
      ],
    });

    const bundle = buildPublicData(snapshot);

    expect(bundle.items).toHaveLength(1);
    const item = bundle.items[0];
    expect(item.id).toBe("item-public");
    expect(Object.keys(item).sort()).toEqual(
      [
        "abstract",
        "authors",
        "createdAt",
        "decisionAt",
        "detail",
        "doi",
        "id",
        "keywords",
        "pinned",
        "progress",
        "publicFields",
        "publicUrl",
        "publishedAt",
        "status",
        "submittedAt",
        "title",
        "type",
        "updatedAt",
        "venueId",
      ].sort(),
    );
    expect(item).not.toHaveProperty("advisors");
    expect(item).not.toHaveProperty("progressPct");
    expect(item).not.toHaveProperty("stageNote");
    expect(item).not.toHaveProperty("submitChecklist");
    expect(item).not.toHaveProperty("priority");
    expect(item).not.toHaveProperty("visibility");
    for (const field of [
      "trackerId",
      "role",
      "researchKind",
      "targetVenue",
      "targetDate",
      "nextStep",
      "dataSource",
      "link",
      "notes",
    ]) {
      expect(item).not.toHaveProperty(field);
    }
    expect(JSON.stringify(bundle)).not.toContain("item-private");
  });

  it("unselected fields are not exported", () => {
    const bundle = buildPublicData(
      makePrivateSnapshot({
        items: [
          makeItem({
            publicFields: ["authors", "progress", "detail"],
            abstract: "abstrak rahasia",
            keywords: ["kata rahasia"],
            detail: "cerita publik",
            doi: "10.1234/rahasia",
            venueId: "venue-rahasia",
          }),
        ],
      }),
    );
    const item = bundle.items[0];

    expect(item.authors).toEqual(["Nusea"]);
    expect(item.progress).toBe(40);
    expect(item.detail).toBe("cerita publik");
    expect(item.abstract).toBe("");
    expect(item.keywords).toEqual([]);
    expect(item.doi).toBe("");
    expect(item.venueId).toBe("");
    expect(item.submittedAt).toBe("");
  });

  it("private assets, localPath, itemIds and notes never leak", () => {
    const snapshot = makePrivateSnapshot({
      items: [
        makeItem({ id: "item-public", visibility: "public" }),
        makeItem({ id: "item-private", visibility: "private" }),
      ],
      assets: [
        makeAsset({ id: "asset-public", itemIds: ["item-public", "item-private"] }),
        makeAsset({
          id: "asset-private",
          visibility: "private",
          url: "https://drive.google.com/private-folder",
        }),
      ],
    });

    const bundle = buildPublicData(snapshot);

    expect(bundle.assets).toHaveLength(1);
    expect(bundle.assets[0].researchIds).toEqual(["item-public"]);
    expect(bundle.assets[0]).not.toHaveProperty("localPath");
    expect(bundle.assets[0]).not.toHaveProperty("itemIds");
    expect(bundle.assets[0]).not.toHaveProperty("note");
    expect(JSON.stringify(bundle)).not.toContain("assets-private/secret.pdf");
    expect(JSON.stringify(bundle)).not.toContain("drive.google.com/private-folder");
    expect(JSON.stringify(bundle)).not.toContain("item-private");
  });

  it("grants and ideas are exported only when public, without edition notes", () => {
    const snapshot = makePrivateSnapshot({
      grants: [
        makeGrant({ id: "grant-private", visibility: "private" }),
        makeGrant({ id: "grant-public" }),
      ],
      ideas: [
        makeIdea({ id: "idea-private", visibility: "private" }),
        makeIdea({ id: "idea-public" }),
      ],
    });

    const bundle = buildPublicData(snapshot);

    expect(bundle.grants.map((grant) => grant.id)).toEqual(["grant-public"]);
    expect(bundle.grants[0]).not.toHaveProperty("editionNote");
    expect(bundle.grants[0]).not.toHaveProperty("maxFundingIdr");
    expect(bundle.grants[0]).not.toHaveProperty("piName");
    expect(bundle.ideas.map((idea) => idea.id)).toEqual(["idea-public"]);
    expect(JSON.stringify(bundle)).not.toContain("catatan edisi rahasia");
    expect(JSON.stringify(bundle)).not.toContain("catatan venue rahasia");
  });

  it("a public profile does not export email or location", () => {
    const bundle = buildPublicData(makePrivateSnapshot({ profile: makeProfile({ visibility: "public" }) }));
    expect(bundle.profile).not.toBeNull();
    expect(bundle.profile).not.toHaveProperty("email");
    expect(bundle.profile).not.toHaveProperty("location");
  });

  it("a private profile yields null", () => {
    const privateProfile = makeProfile({ visibility: "private" });
    expect(toPublicProfile(privateProfile)).toBeNull();

    const bundle = buildPublicData(
      makePrivateSnapshot({ profile: privateProfile }),
    );
    expect(bundle.profile).toBeNull();
  });

  it("unknown fields on private objects are not exported", () => {
    const polluted = {
      ...makeItem({ id: "item-polluted" }),
      notes: "rahasia",
      private_token: "abc",
      sources: [{ url: "https://private.example.com/source" }],
    } as unknown as ReturnType<typeof makeItem>;

    const bundle = buildPublicData(makePrivateSnapshot({ items: [polluted] }));
    const serialized = JSON.stringify(bundle);

    expect(serialized).not.toContain("rahasia");
    expect(serialized).not.toContain("private_token");
    expect(serialized).not.toContain("private.example.com");
  });
});
