# Volkorne — L’atelier de rentabilité

Calculateur local en français pour chiffrer la capture, la montée en niveau et le brisage de Volkornes sur DOFUS PC 3.7. Sans dépendances, compte, télémétrie ou récupération automatique des prix HDV.

## Site en ligne

[Ouvrir le calculateur sur Google Sites](https://sites.google.com/view/dofus-rentabilite-elevage/calculateur).

Le fichier autonome est intégré en pleine page. La publication est manuelle : une modification du dépôt ne met pas automatiquement à jour Google Sites. Voir la [procédure de publication et les vérifications des listes déroulantes](docs/google-sites.md).

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

## Calcul rapide

Le simulateur se remplit directement : nombre de montures, niveau cible, prix d’une Ga Pa, **taux de Ga Pa en pourcentage**, filet choisi, prix du filet, captures moyennes et prix du carburant. Le tableau de relevés est facultatif.

Exemple avec une **hypothèse de 40 %**, pour 20 montures au niveau 55, sans focus :

- Ga Pa à 20 000 kamas → 8 runes estimées → 156 800 kamas après taxe de 2 %.
- Filet renforcé à 17 500 kamas, 7 montures par filet → 3 filets → 52 500 kamas.
- Extrait à 1 500 kamas pour 6 000 points → 16 unités pour les deux groupes de dix → 24 000 kamas.
- Bénéfice estimé : **80 300 kamas** (156 800 − 76 500), avec les autres paramètres initiaux.

40 % signifie 0,4 Ga Pa par monture, soit 40 runes pour 100 montures en moyenne. Ce chiffre est une hypothèse de simulation, pas une mesure du niveau 55. Le taux reste celui que vous avez saisi lorsque vous changez le niveau cible. Une valeur supérieure à 100 % exprime une moyenne supérieure à une rune par monture.

La répartition avec focus PA se déplie sous le lot ; chaque groupe dispose de son propre taux. Un taux vide reste inconnu, tandis que zéro signifie zéro rune attendue. Les réglages d’XP, de temps, les frais supplémentaires et l’investissement sont repliés. Le bilan affiche dépenses, recettes nettes et bénéfice, puis le prix minimum d’une Ga Pa et le taux moyen du lot nécessaires pour couvrir les frais. Le seuil de taux inclut les ventes annexes et la taxe et exclut l’investissement fixe, comme le bénéfice du cycle.

## Fonctionnalités

- Deux filets renseignés à partir de vos repères : renforcé niveau 149 à 17 500 kamas pour 7 montures en moyenne (fourchettes : 15 000–20 000 kamas et 6–8 montures) ; multiplicateur renforcé niveau 200 à 42 000 kamas pour 13,5 montures en moyenne (12–15 montures). Prix et moyennes restent modifiables ; le nombre de filets achetés est arrondi au supérieur.
- Vingt carburants d’XP : prix mémorisé par référence, quantité de carburant modifiable, consommation partagée par groupe de dix montures, même incomplet.
- Table d’XP des 200 niveaux, niveau initial, 1 à 6 enclos simultanés et vagues successives.
- Répartition du lot entre focus PA et sans focus, prix de la Ga Pa et valeur des autres runes ou ressources.
- Bénéfice net, taxe fixe de 2 %, ROI du cycle, prix de Ga Pa à l’équilibre, trésorerie initiale et amortissement de l’investissement fixe.
- Temps actif, attente en enclos et rendement en kamas par heure totale ou active.
- Coûts pour tous les niveaux, classement limité aux niveaux mesurés avec trois objectifs : bénéfice, rendement horaire total, ROI du cycle. Export CSV compatible avec les décimales françaises.
- Configuration et relevés exportables/importables en JSON, interface responsive et utilisation hors ligne après génération du fichier autonome.

## Taux saisi, rendement mesuré et limites

La projection d’équipement et l’interpolation ont été retirées. La recherche du 27 octobre 2026 a permis de qualifier **un seul niveau**, sans établir de table exhaustive ni de formule officielle.

| Niveau | Mode | Montures | Ga Pa obtenues | Moyenne par monture | Publication |
| --- | --- | ---: | ---: | ---: | --- |
| 53 | Sans focus | 10 000 | 3 832 | 0,3832 | 4 août 2026 |

Source primaire : [bilan de Solomonk-e vers 30:22](https://www.youtube.com/watch?v=fGqEPyQoBgk&t=1822s). Le [créateur confirme en réponse que toutes les montures étaient au niveau 53](https://www.youtube.com/watch?v=fGqEPyQoBgk&lc=UgxQG9dbDLVEbMLsW2Z4AaABAg.A_5xazn3BBRA_5zmc6NnPu). Les libellés quantité/prix sont inversés dans sa ligne Ga Pa du tableur : 3 832 est le nombre de runes, 34 000 leur prix, conformément à la narration. Le relevé de 0,3832 représente une moyenne sur ce lot, pas une probabilité officielle ou un rendement garanti pour la 3.7.

Aucune mesure qualifiée n’a été retenue aux niveaux 54, 55 ou 100, ni en focus PA. Les valeurs approximatives de guides et les formules théoriques d’autres outils ne sont pas assimilées à des observations. Le détail de l’audit figure dans [docs/brisage-volkornes.md](docs/brisage-volkornes.md).

Le scénario initial contient 20 montures au niveau 53, sans focus, avec un taux directement modifiable prérempli à 38,32 % à partir du relevé public. Le mode « Taux saisi » est une hypothèse appliquée au seul niveau du scénario ; il ne produit aucune recommandation de niveau. Les scénarios sauvegardés conservent leur niveau et leur répartition ; s’ils utilisent un niveau ou un mode non mesuré, seules leurs dépenses sont calculées. Un bouton permet de simuler explicitement le niveau 53 sans focus.

Les relevés personnels couvrent uniquement leur niveau exact. Laisser vide un mode non testé ; zéro désigne un résultat nul effectivement observé. Le classement exige au moins deux niveaux mesurés dans tous les modes utilisés et reste limité à ces niveaux. Aucun optimum global n’est affirmé et les points du graphique ne sont pas reliés. Les tailles d’échantillon et les conditions de jeu peuvent différer.

Les prix et rendements des filets reprennent vos repères ; les prix des carburants restent des exemples. Le bilan applique la taxe fixe de 2 %, sans tenir compte des capacités Sage.

Les sauvegardes et exports JSON v1/v2/v3 restent lisibles : prix personnalisés et relevés sont conservés ; les anciens modes théoriques passent au relevé public sans inventer de données au niveau sauvegardé. Le coefficient de brisage est retiré : les nombres de runes mesurés n’ont pas à être multipliés une seconde fois. Les configurations mesurées v3 conservent leur source, leur niveau et leur répartition. Les nouveaux exports portent la version 4, avec les deux taux de simulation indépendants.

### Carburant et temps

Le carburant remplit une jauge, il ne donne pas instantanément de l’XP. Une jauge affecte jusqu’à dix montures et perd autant de points pour un groupe incomplet. Le calcul arrondit le besoin aux ticks de dix points puis aux unités de carburant achetées, séparément pour chaque groupe. Les surplus et la réserve de jauge sont intégralement facturés, sans crédit de réutilisation ; ce choix est conservateur. La réserve n’est pas comptée comme de l’XP consommée.

Les boutons de tier configurent la vitesse nominale (3 600 à 14 400 XP/h), le carburant de la famille correspondante et une réserve de jauge facturée pour rester au-dessus du seuil du tier. Ces vitesses supposent un réapprovisionnement suffisant. Une saisie libre permet d’utiliser une moyenne effectivement observée. Tous les Volkornes du lot sont supposés avoir le même niveau de départ. Les capacités des montures, dont Sage, ne sont pas prises en compte. La taxe est fixée à 2 % sur toutes les recettes, y compris les autres ventes.

Le temps total additionne capture, manipulations et attente des vagues successives, sans chevauchement. L’achat de montures au lieu de la capture, la reproduction, les délais de vente, la volatilité des prix et le coût d’opportunité du temps actif ne sont pas modélisés automatiquement. Les autres frais et ventes permettent d’ajuster le bilan.

Le bénéfice du cycle exclut l’investissement fixe. Celui-ci est ajouté au budget initial, soustrait du solde après le premier cycle et amorti sur les bénéfices des cycles suivants. Aucune valeur de revente du fixe n’est supposée.

### Sources

Consultées le **27 octobre 2026** :

- [Guide de l’éleveur, Dofus pour les Noobs](https://www.dofuspourlesnoobs.com/guide-de-l-eleveur.html) : filets, jauges, capacité des enclos, carburants et refonte 3.7.
- [Tableaux d’expérience, Dofus pour les Noobs](https://www.dofuspourlesnoobs.com/tableaux-dexpeacuterience.html) : table monture, notamment 42 906 XP au niveau 55, 172 668 au niveau 100, 867 582 au niveau 200. Seules les valeurs numériques de la table sont intégrées.
- [Bilan de brisage de Solomonk-e](https://www.youtube.com/watch?v=fGqEPyQoBgk&t=1822s) : relevé public intégré ; voir les preuves et limites ci-dessus.
- [Retour d’expérience sur le focus, septembre 2026](https://www.reddit.com/r/DOFUS_FRANCE/comments/1wcf826/brisage_de_volkorne/) : témoignages sur le coefficient de 50 % et le focus sans effet, sans confirmation officielle.

Le contenu du site officiel Ankama n’a pas été accessible lors de cette vérification. Les limites sont également affichées dans l’interface.

## Vérification

```sh
npm run check
npm test
npm run build
```

Les tests couvrent les seuils d’XP, les groupes incomplets, l’absence de bonus Sage, la taxe fixe, la migration des anciennes sauvegardes, les vagues d’enclos, les arrondis des filets et du carburant, la réserve, les taxes, le seuil de rentabilité, l’amortissement, les taux saisis en pourcentage, les seuils de taux, les variations des prix des filets et carburants, les relevés publics sourcés, l’absence d’interpolation, les modes manquants, les entrées invalides, les cas sans coût/temps/rendement, l’export CSV et le serveur HTTP local. Le test HTTP nécessite l’accès à la boucle locale du système.

Le fichier autonome est généré depuis les mêmes sources que l’aperçu. Le build vérifie également la syntaxe du module JavaScript assemblé. La CI lance ces trois commandes ; aucun déploiement automatique n’est configuré.
