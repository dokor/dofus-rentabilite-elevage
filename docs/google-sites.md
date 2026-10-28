# Publication Google Sites

Publié le 28 octobre 2026 : [calculateur Volkorne](https://sites.google.com/view/dofus-rentabilite-elevage/calculateur).

Le site contient une page « Calculateur », définie comme page d’accueil, avec une intégration de la page entière par code HTML. Le contenu intégré est exactement le fichier généré `standalone/volkorne.html`. Aucun hébergement supplémentaire ni récupération de prix HDV n’est utilisé. L’accès publié est ouvert à tout le monde.

Sources de la première publication : commit `be35a66c5c793f7b797c5e4125693e79b4b87a1b`, identiques au contenu de `main` après fusion de la PR #1 (`3a194c7`). La présente documentation ne modifie pas le calculateur publié.

## Mettre à jour le site existant

1. Vérifier les changements avec `npm run check`, `npm test` et `npm run build`.
2. Ouvrir l’[éditeur du site existant](https://sites.google.com/d/1B728zrJ58DUtg2ijJPGLRBHCLl4it7WG/p/1SuZdX5CiaFpUqKQA7L60eFW8OWZr3wmL/edit) avec le compte propriétaire.
3. Modifier l’élément intégré de la page « Calculateur » et remplacer son code par tout le contenu de `standalone/volkorne.html`.
4. Vérifier l’aperçu, notamment les deux sélecteurs, leurs prix et le bilan, puis publier les changements.
5. Ouvrir l’adresse publique et vérifier le rendu du calculateur.

Un simple push Git ou un build local ne republie pas le site Google. Le HTML publié contient les valeurs initiales, pas les prix personnalisés des essais.

## Vérifications des sélecteurs

Essais dans le navigateur le 28 octobre 2026, sur 20 montures niveau 55 sans focus, avec une hypothèse de 40 % et une Ga Pa à 20 000 kamas. Les autres paramètres sont ceux de l’exemple initial.

| Filet et prix unitaire | Carburant et prix unitaire | Quantité de carburant du lot | Bénéfice constaté |
| --- | --- | ---: | ---: |
| Renforcé · 17 500 k | Extrait · 1 500 k | 16 | 80 300 k |
| Multiplicateur renforcé · 42 000 k | Extrait · 1 500 k | 16 | 48 800 k |
| Renforcé · 17 500 k | Gigantesque Extrait · 3 500 k saisis pour l’essai | 10 | 69 300 k |
| Retour au renforcé · 17 500 k | Retour à l’Extrait · 1 500 k mémorisés | 16 | 80 300 k |

Le prix propre au carburant et sa charge sont restaurés lors de la sélection. Revenir au Gigantesque Extrait retrouve les 3 500 k saisis et le bénéfice de 69 300 k. Le changement de filet restaure également son prix et son rendement, puis recalcule le budget et le bénéfice.

Ces interactions ont aussi été vérifiées dans l’aperçu Google Sites avec le scénario initial niveau 53 à 38,32 %. Après publication, le calculateur s’affiche sur son adresse publique avec les listes initialisées et le bilan calculé. Le build vérifie la syntaxe du JavaScript effectivement intégré au HTML final.
