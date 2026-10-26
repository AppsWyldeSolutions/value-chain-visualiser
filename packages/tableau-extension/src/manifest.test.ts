// @vitest-environment jsdom
// (For DOMParser, to read the manifests back as XML.)
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEV_URL,
  EXTENSION_ID,
  manifest,
  MIN_API_VERSION,
  PLACEHOLDER_URL,
  sourceUrl,
} from "./manifest.js";

const ICON = readFileSync(path.resolve(__dirname, "../assets/icon.png"));
const options = {
  version: "1.2.3",
  url: PLACEHOLDER_URL,
  icon: ICON.toString("base64"),
};

function parse(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  expect(doc.querySelector("parsererror")).toBeNull();
  return doc;
}

const text = (doc: Document, selector: string) =>
  doc.querySelector(selector)?.textContent;

describe("manifest", () => {
  it("is a well-formed .trex for a dashboard extension", () => {
    const doc = parse(manifest(options));
    const root = doc.documentElement;
    expect(root.nodeName).toBe("manifest");
    expect(root.getAttribute("manifest-version")).toBe("0.1");
    expect(root.namespaceURI).toBe(
      "http://www.tableau.com/xml/extension_manifest",
    );
    expect(doc.querySelectorAll("dashboard-extension")).toHaveLength(1);
  });

  it("names the extension by its reverse-domain id and the package version", () => {
    const extension = parse(manifest(options)).querySelector(
      "dashboard-extension",
    )!;
    expect(extension.getAttribute("id")).toBe(EXTENSION_ID);
    expect(EXTENSION_ID).toMatch(/^[a-z]+(\.[a-z]+){2,}$/);
    expect(extension.getAttribute("extension-version")).toBe("1.2.3");
  });

  it("gives the name, description, locale, author and minimum API version", () => {
    const doc = parse(manifest(options));
    expect(text(doc, "default-locale")).toBe("en_US");
    expect(
      text(doc, 'resources resource[id="name"] text[locale="en_US"]'),
    ).toBe("Value Chain Visualiser");
    expect(text(doc, "description")).toMatch(/value chain/i);
    expect(text(doc, "min-api-version")).toBe(MIN_API_VERSION);
    const author = doc.querySelector("author")!;
    expect(author.getAttribute("name")).toBe("Wylde Solutions Pty Ltd");
    // Tableau requires a name and an https website.
    expect(author.getAttribute("website")).toMatch(/^https:\/\//);
  });

  it("points at the source location it is given", () => {
    const doc = parse(manifest(options));
    expect(text(doc, "source-location url")).toBe(PLACEHOLDER_URL);
  });

  it("carries the 70x70 PNG icon, base64-encoded", () => {
    const icon = Buffer.from(
      text(parse(manifest(options)), "icon") ?? "",
      "base64",
    );
    // A PNG's signature, then its IHDR width and height.
    expect(icon.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(icon.readUInt32BE(16)).toBe(70);
    expect(icon.readUInt32BE(20)).toBe(70);
  });

  it("asks for no permissions: summary data needs none", () => {
    expect(parse(manifest(options)).querySelector("permissions")).toBeNull();
  });

  it("gives the development manifest its own id and name", () => {
    const doc = parse(manifest({ ...options, url: DEV_URL, dev: true }));
    expect(doc.querySelector("dashboard-extension")?.getAttribute("id")).toBe(
      `${EXTENSION_ID}.dev`,
    );
    expect(
      text(doc, 'resources resource[id="name"] text[locale="en_US"]'),
    ).toBe("Value Chain Visualiser (dev)");
    expect(text(doc, "source-location url")).toBe(DEV_URL);
  });

  it("escapes the values it writes into the XML", () => {
    const url = "https://example.com/vcv/index.html?a=1&b=<2>";
    const doc = parse(manifest({ ...options, url }));
    expect(text(doc, "source-location url")).toBe(url);
  });
});

describe("sourceUrl", () => {
  it("takes the placeholder when no hosted URL is given", () => {
    expect(sourceUrl(undefined)).toBe(PLACEHOLDER_URL);
    expect(sourceUrl("")).toBe(PLACEHOLDER_URL);
  });

  it("takes an https URL, and http only for localhost", () => {
    expect(sourceUrl("https://vcv.example.com/tableau/")).toBe(
      "https://vcv.example.com/tableau/",
    );
    expect(sourceUrl(DEV_URL)).toBe(DEV_URL);
  });

  it("refuses anything Tableau would not load", () => {
    expect(() => sourceUrl("http://vcv.example.com/")).toThrow(/https/);
    expect(() => sourceUrl("ftp://vcv.example.com/")).toThrow(/https/);
    expect(() => sourceUrl("not a url")).toThrow(/not a URL/);
  });
});
