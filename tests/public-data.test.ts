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

describe("allowlist data publik", () => {
  it("hanya mengekspor item public dan membuang field privat", () => {
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
        "advisors",
        "authors",
        "createdAt",
        "decisionAt",
        "doi",
        "id",
        "keywords",
        "pinned",
        "progressPct",
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
    expect(item).not.toHaveProperty("stageNote");
    expect(item).not.toHaveProperty("submitChecklist");
    expect(item).not.toHaveProperty("priority");
    expect(item).not.toHaveProperty("visibility");
    expect(JSON.stringify(bundle)).not.toContain("item-private");
  });

  it("aset privat, localPath, itemIds, dan note tidak pernah keluar", () => {
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

  it("hibah dan ide hanya keluar bila public, tanpa catatan edisi", () => {
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
    expect(bundle.ideas.map((idea) => idea.id)).toEqual(["idea-public"]);
    expect(JSON.stringify(bundle)).not.toContain("catatan edisi rahasia");
    expect(JSON.stringify(bundle)).not.toContain("catatan venue rahasia");
  });

  it("profil privat menghasilkan null", () => {
    const privateProfile = makeProfile({ visibility: "private" });
    expect(toPublicProfile(privateProfile)).toBeNull();

    const bundle = buildPublicData(
      makePrivateSnapshot({ profile: privateProfile }),
    );
    expect(bundle.profile).toBeNull();
  });

  it("field tak dikenal di objek privat tidak ikut terekspor", () => {
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
