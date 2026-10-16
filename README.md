# Veida AI Image Generator userscript

Select any text on any page, click **🎨 Image**, and the picture appears in a small
panel in the corner. Free, with no API key and no account: the script runs on the
anonymous tier of [Veida AI](https://veida.ai/?utm_source=github&utm_medium=userscript),
an unlimited free AI image generator.

- **Install:** from Greasy Fork, with Tampermonkey, Violentmonkey or Greasemonkey.
- **Prompt box:** the userscript menu has "Generate an image from a prompt…" for
  typing a prompt instead of selecting one.
- **Each image** is one anonymous run on Veida AI Image v1. One machine gets about
  seven a day; signing in on veida.ai makes v1 unlimited.

Want the same picture from a stronger model? Open it in
[GPT Image 2.5 on Veida AI](https://veida.ai/image/gpt-image-2-5?utm_source=github&utm_medium=userscript),
or browse [all AI image models](https://veida.ai/image?utm_source=github&utm_medium=userscript).

The script talks only to `veida.ai`. It sends the selected text and a random id
created for that one request; nothing is stored.

MIT licensed.
