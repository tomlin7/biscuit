function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Copied to clipboard');
    }, (err) => {
        console.error('Failed to copy to clipboard', err);
    });
}
