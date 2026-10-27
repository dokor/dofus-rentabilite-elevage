# Volkorne — L’atelier de rentabilité

Calculateur local en français pour chiffrer la capture, la montée en niveau et le brisage de Volkornes sur DOFUS PC 3.7. Sans dépendances, compte, télémétrie ou récupération automatique des prix HDV.

## Utilisation

Avec Node.js 20 ou plus récent :

```sh
npm run dev
```

Ouvrir `http://127.0.0.1:4173`. Le serveur écoute uniquement sur la boucle locale.

Pour obtenir un fichier à ouvrir directement dans le navigateur, sans serveur :

```sh
npm run build
```

Ouvrir ensuite `standalone/volkorne.html`. Tout est intégré dans ce fichier. Les paramètres et relevés sont enregistrés dans le stockage local du navigateur, lorsque celui-ci est disponible. L’export JSON permet de les conserver ou de les transférer entre appareils et origines ; le stockage d’un fichier `file:` peut varier selon le navigateur.

## Fonctionnalités

- Quatre filets : prix et captures moyennes modifiables, comparaison du coût réel du lot, arrondi des unités achetées.
- Vingt carburants d’XP : prix mémorisé par référence, quantité de carburant modifiable, consommation partagée par groupe de dix montures, même incomplet.
- Table d’XP des 200 niveaux, niveau initial, capacité Sage, 1 à 6 enclos simultanés et vagues successives.
- Répartition du lot entre focus PA et sans focus, prix de la Ga Pa et valeur des autres runes ou ressources.
- Bénéfice net, taxe, ROI du cycle, prix de Ga Pa à l’équilibre, trésorerie initiale et amortissement de l’investissement fixe.
- Temps actif, attente en enclos et rendement en kamas par heure totale ou active.
- Comparaison de tous les niveaux, avec trois objectifs : bénéfice, rendement horaire total, ROI du cycle. Export CSV compatible avec les décimales françaises.
- Configuration et relevés exportables/importables en JSON, interface responsive et utilisation hors ligne après génération du fichier autonome.

## Fiabilité des données et hypothèses

**Le rendement du brisage des Volkornes par niveau n’est pas confirmé par une source officielle.** Le mode initial est une projection explicitement signalée, pas une table de taux observés. Il applique la formule communautaire de brisage d’équipement à une ligne hypothétique de 1 PA :

```text
Ga Pa par monture = ((100 × niveau × 0,015 + 1) / 100) × coefficient / 100
```

Au coefficient supposé de 50 %, cette projection donne 0,4175 Ga Pa au niveau 55 et 0,755 au niveau 100. Le PA équipé n’apparaît qu’au niveau 100 ; cela ne valide pas la projection pour les montures. Les recommandations restent conditionnelles à cette hypothèse.

Des retours de joueurs indiquent que le focus ne change pas le résultat sur les Volkornes. Le mode projection ne lui attribue donc aucun bonus et conserve les autres runes sur le lot complet. Le mode **Mes relevés** permet de saisir des rendements distincts avec et sans focus. Il utilise les valeurs exactes aux niveaux saisis, interpole entre deux relevés, et ne produit aucune estimation en dehors de leur plage. Les rendements saisis sont des runes moyennes par monture, sans nouvelle multiplication par le coefficient.

Tous les prix de départ sont des **exemples**. Il faut les remplacer par ceux du serveur. Les résultats sont des espérances, sans garantie sur un petit lot. Les résultats bruts des sous-groupes sont arrondis pour l’affichage seulement.

### Carburant et temps

Le carburant remplit une jauge, il ne donne pas instantanément de l’XP. Une jauge affecte jusqu’à dix montures et perd autant de points pour un groupe incomplet. Le calcul arrondit le besoin aux ticks de dix points puis aux unités de carburant achetées, séparément pour chaque groupe. Les surplus et la réserve de jauge sont intégralement facturés, sans crédit de réutilisation ; ce choix est conservateur. La réserve n’est pas comptée comme de l’XP consommée.

Les boutons de tier configurent la vitesse nominale hors Sage (3 600 à 14 400 XP/h), le carburant de la famille correspondante et une réserve de jauge facturée pour rester au-dessus du seuil du tier. Ces vitesses supposent un réapprovisionnement suffisant. Une saisie libre permet d’utiliser une moyenne effectivement observée. Tous les Volkornes du lot sont supposés avoir le même niveau de départ et le même statut Sage ; créer deux simulations pour un lot hétérogène.

Le temps total additionne capture, manipulations et attente des vagues successives, sans chevauchement. L’achat de montures au lieu de la capture, la reproduction, les délais de vente, la volatilité des prix et le coût d’opportunité du temps actif ne sont pas modélisés automatiquement. Les autres frais et ventes permettent d’ajuster le bilan.

Le bénéfice du cycle exclut l’investissement fixe. Celui-ci est ajouté au budget initial, soustrait du solde après le premier cycle et amorti sur les bénéfices des cycles suivants. Aucune valeur de revente du fixe n’est supposée.

### Sources

Consultées le **27 octobre 2026** :

- [Guide de l’éleveur, Dofus pour les Noobs](https://www.dofuspourlesnoobs.com/guide-de-l-eleveur.html) : filets, jauges, capacité des enclos, carburants et refonte 3.7.
- [Tableaux d’expérience, Dofus pour les Noobs](https://www.dofuspourlesnoobs.com/tableaux-dexpeacuterience.html) : table monture, notamment 42 906 XP au niveau 55, 172 668 au niveau 100, 867 582 au niveau 200. Seules les valeurs numériques de la table sont intégrées.
- [Calculateur de brisage, Dofus Portals](https://dofus-portals.fr/outils/calculateur-brisage/) : formule communautaire des équipements utilisée comme projection.
- [Retour d’expérience sur le focus, septembre 2026](https://www.reddit.com/r/DOFUS_FRANCE/comments/1wcf826/brisage_de_volkorne/) : témoignages sur le coefficient de 50 % et le focus sans effet, sans confirmation officielle.

Le contenu du site officiel Ankama n’a pas été accessible lors de cette vérification. Les limites sont également affichées dans l’interface.

## Vérification

```sh
npm run check
npm test
npm run build
```

Les tests couvrent les seuils d’XP, les groupes incomplets, Sage, les vagues d’enclos, les arrondis des filets et du carburant, la réserve, les taxes, le seuil de rentabilité, l’amortissement, les relevés, l’interpolation, les entrées invalides, les cas sans coût/temps/rendement, l’export CSV et le serveur HTTP local. Le test HTTP nécessite l’accès à la boucle locale du système.

Le fichier autonome est généré depuis les mêmes sources que l’aperçu. Le build vérifie également la syntaxe du module JavaScript assemblé. La CI lance ces trois commandes ; aucun déploiement automatique n’est configuré.
