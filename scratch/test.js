
async function main() {
    const res = await fetch('https://firestore.googleapis.com/v1/projects/soy-nexo/databases/(default)/documents/campaigns/main_campaign/config/profile');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
main();
