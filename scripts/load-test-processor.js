/**
 * Artillery Load Test Processor
 * Generates random test data for load testing scenarios
 */

// Random French airport-related messages
const TEST_MESSAGES = [
  "Bonjour, mon vol AF1234 est à quelle heure ?",
  "Où manger au terminal 2E du CDG ?",
  "Comment aller à Paris depuis Orly ?",
  "Mon vol est retardé, que faire ?",
  "Où est la consigne à bagages terminal 2F ?",
  "Je cherche un salon VIP à CDG",
  "Y a-t-il un bus pour aller à Orly depuis CDG ?",
  "Où se trouve le duty free terminal 2B ?",
  "Mon vol EasyJet a quelle porte d'embarquement ?",
  "Je voudrais réserver un hôtel près de CDG",
  "WiFi gratuit à l'aéroport ?",
  "Combien coûte un taxi pour Paris centre ?",
  "Où trouver un distributeur de billets ?",
  "Y a-t-il une pharmacie dans le terminal ?",
  "Mon bagage n'est pas arrivé sur le tapis",
  "Je cherche la porte C42 au terminal 2E",
  "Hello, where can I eat at CDG?",
  "A quelle heure ouvre le duty free ?",
  "Où prendre le RER B depuis CDG ?",
  "Je voudrais savoir si mon vol est à l'heure",
  "Salut, tu peux m'aider ?",
  "Information sur les parkings CDG",
  "Location de voiture à l'aéroport",
  "Où sont les toilettes au terminal 1 ?",
  "Je voudrais faire du shopping avant mon vol",
  "Quels restaurants sont ouverts à 22h ?",
  "Comment rejoindre le terminal 2G depuis 2E ?",
  "Existe-t-il des salles de repos ?",
  "Je cherche un bureau de change",
  "Merci pour ton aide, au revoir !",
];

module.exports = {
  // Generate a random message for load testing
  pickRandomMessage: function (userContext, events, done) {
    const idx = Math.floor(Math.random() * TEST_MESSAGES.length);
    userContext.vars.pickRandomMessage = TEST_MESSAGES[idx];
    return done();
  },
};
