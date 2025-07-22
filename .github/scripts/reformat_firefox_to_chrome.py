# This script reformats the Firefox extension code to be compatible with Chrome

import os
import shutil

def reformat_firefox_to_chrome():
    firefox_extension_path = '/src'
    chrome_extension_path = '/src_chrome'

    # Manifest is different in Chrome and Firefox (already added to folder)
    # Also LICENSE is left in the folder

    # Move static files folders
    already_in_folder = ['manifest.json', 'LICENSE.md', '/popup/popup.html']

    # copy all files (without overriding already_in_folder)
    for item in os.listdir(firefox_extension_path):
        if item not in already_in_folder:
            src = os.path.join(firefox_extension_path, item)
            dst = os.path.join(chrome_extension_path, item)
            if os.path.isdir(src):
                shutil.copytree(src, dst, dirs_exist_ok=True)
            else:
                shutil.copy2(src, dst)
    
    # Change in all js files the 'browser' to 'chrome'
    for root, dirs, files in os.walk(chrome_extension_path):
        for file in files:
            if file.endswith('.js'):
                file_path = os.path.join(root, file)
                with open(file_path, 'r+', encoding='utf-8') as f:
                    content = f.read()
                    content = content.replace('browser.', 'chrome.')
                    f.seek(0)
                    f.write(content)
                    f.truncate()

    print("Reformatting from Firefox to Chrome completed.")

if __name__ == "__main__":
    reformat_firefox_to_chrome()