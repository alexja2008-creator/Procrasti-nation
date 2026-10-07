/** Web: the browser downloads the file. */
export async function saveFile(name: string, contents: string, mimeType: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before letting go of the data.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
