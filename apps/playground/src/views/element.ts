import "@appswyldesolutions/vcv-web-component/define";

// <value-chain-visualiser> loading a fixture over HTTP: the playground serves
// fixtures/ as static files. ?src=<file> picks which one, and
// ?display=full|compact sets data-card-display.
export function renderElement(app: HTMLElement): void {
  const params = new URLSearchParams(location.search);
  const src = params.get("src") ?? "bobos-big-block.json";
  const element = document.createElement("value-chain-visualiser");
  element.setAttribute("data-src", `/${src}`);
  const display = params.get("display");
  if (display) element.setAttribute("data-card-display", display);
  element.style.minHeight = "100%";
  app.appendChild(element);
}
