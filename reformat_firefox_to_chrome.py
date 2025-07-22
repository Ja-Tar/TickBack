# This script reformats the Firefox extension code to be compatible with Chrome

import os
import shutil

def reformat_firefox_to_chrome():
    firefox_extension_path = './src'
    chrome_extension_path = './src_chrome'

    # Manifest is different in Chrome and Firefox (already added to folder)
    # Also LICENSE is left in the folder

    # Move static files folders
    already_in_folder = ['manifest.json', 'LICENSE.md', 'popup.html']
    

    # copy all files (without overriding already_in_folder)
    check_files(firefox_extension_path, chrome_extension_path, already_in_folder)
    
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

def check_files(firefox_extension_path, chrome_extension_path, already_in_folder):
    for item in os.listdir(firefox_extension_path):
        if item not in already_in_folder:
            src = os.path.join(firefox_extension_path, item)
            dst = os.path.join(chrome_extension_path, item)
            if not os.path.exists(dst):
                os.makedirs(os.path.dirname(dst), exist_ok=True)
            if os.path.isdir(src):
                # check for already existing files
                check_files(src, dst, already_in_folder)
            else:
                shutil.copy2(src, dst)

if __name__ == "__main__":
    reformat_firefox_to_chrome()