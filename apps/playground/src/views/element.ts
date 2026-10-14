import "@AppsWyldeSolutions/vcv-web-component/define";

// <value-chain-visualiser> loading a fixture over HTTP: the playground serves
// fixtures/ as static files. ?src=<file> picks which one.
export function renderElement(app: HTMLElement): void {
  const src =
    new URLSearchParams(location.search).get("src") ?? "bobos-big-block.json";
  const element = document.createElement("value-chain-visualiser");
  element.setAttribute("data-src", `/${src}`);
  element.style.minHeight = "100%";
  app.appendChild(element);
}
