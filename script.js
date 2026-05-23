console.log("Discord-inspired profile page loaded");

document.addEventListener("DOMContentLoaded", () => {
  const yearText = document.querySelector("footer p");

  if (yearText) {
    const year = new Date().getFullYear();
    yearText.textContent = `© ${year} 骷髏. All rights reserved.`;
  }
});
