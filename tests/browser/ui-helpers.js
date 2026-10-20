// Open the containing section through its visible summary, like a player would.
export async function revealAction(page,selector) {
  for(let i=0;i<4&&!await page.locator(selector).first().isVisible();i++) {
    const section=page.locator('details:not([open])').filter({has:page.locator(selector)}).first();
    if(!await section.count())return;
    await section.locator(':scope > summary').click();
  }
}
