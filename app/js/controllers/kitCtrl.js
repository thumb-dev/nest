four51.app.controller('KitCtrl', ['$scope', '$location', '$routeParams', '$timeout', 'Kit', 'ProductDisplayService', 'Order', 'User', 'Variant', function($scope, $location, $routeParams, $timeout, Kit, ProductDisplayService, Order, User, Variant) {
  $scope.addToOrderText = 'Add Kit to Cart';
  $scope.updateKitLineItemText = 'Update';

  // Gift kits (e.g. the men's and women's gift kits) are always one per order:
  // the quantity step is hidden and the kit goes in at a quantity of 1.
  // Gift items load in the background (GiftItems in filters.js), so this is
  // watched rather than checked once when the page loads.
  $scope.isGiftKit = false;
  $scope.kitSkipQuantity = false;
  function kitIsGift() {
	if (!$scope.Kit || !four51.isGiftProduct) return false;
	var parent = $scope.kitParentLineItem && $scope.kitParentLineItem.Product;
	return four51.isGiftProduct($scope.Kit.KitParent) || four51.isGiftProduct(parent);
  }
  function setGiftKitQuantity() {
	var parent = $scope.kitParentLineItem;
	if ($scope.isGiftKit && parent && !parent.ID) parent.Quantity = 1;
  }
  $scope.$watch(kitIsGift, function(gift) {
	$scope.isGiftKit = gift;
	$scope.kitSkipQuantity = gift;
	setGiftKitQuantity();
  });

  $scope.settings = {
	currentPage: 1,
	pageSize: 10
  };

  $scope.CartContainsCustomShipperProductPO = false;
  $scope.productappPO = false;
  $scope.cartapparelPO = false;
  $scope.ProductHasCustomShipperPO = false;

  if ($scope.$parent.currentOrder) {
	angular.forEach($scope.$parent.currentOrder.LineItems, function(item) {
	  if (item.Product.StaticSpecGroups && item.Product.StaticSpecGroups.paymentPO !== undefined) {
		if (item.Product.StaticSpecGroups.paymentPO.Specs['Item'].Value === 'true') {
		  $scope.cartapparelPO = true;
		  $scope.CartContainsCustomShipperProductPO = true;
		}
	  }
	});
  }
  $scope.$watch('LineItem.Product', function(newVal) {
	if (!newVal) return;
	if ($scope.LineItem.Product.StaticSpecGroups && $scope.LineItem.Product.StaticSpecGroups.paymentPO !== undefined) {
	  if ($scope.LineItem.Product.StaticSpecGroups.paymentPO.Specs['Item'].Value === 'true') {
		$scope.productappPO = true;
		$scope.ProductHasCustomShipperPO = true;
	  }
	}
	$scope.allowProductToBeAddedPO = (($scope.cartapparelPO || !$scope.currentOrder) && $scope.productappPO) ||
	  (!$scope.cartapparelPO && !$scope.productappPO);
  });

  // Polo Program
  $scope.CartContainsCustomShipperProductReach = false;
  $scope.productappReach = false;
  $scope.cartapparelReach = false;
  $scope.ProductHasCustomShipperReach = false;

  if ($scope.currentOrder) {
	angular.forEach($scope.currentOrder.LineItems, function(item) {
	  if (item.Product.StaticSpecGroups && item.Product.StaticSpecGroups.reachCC !== undefined) {
		if (item.Product.StaticSpecGroups.reachCC.Specs['Item'].Value === 'true') {
		  $scope.cartapparelReach = true;
		  $scope.CartContainsCustomShipperProductReach = true;
		}
	  }
	});
  }
  $scope.$watch('LineItem.Product', function(newVal) {
	if (!newVal) return;
	if ($scope.LineItem.Product.StaticSpecGroups && $scope.LineItem.Product.StaticSpecGroups.reachCC !== undefined) {
	  if ($scope.LineItem.Product.StaticSpecGroups.reachCC.Specs['Item'].Value === 'true') {
		$scope.productappReach = true;
		$scope.ProductHasCustomShipperReach = true;
	  }
	}
	$scope.allowProductToBeAddedReach = (($scope.cartapparelReach || !$scope.currentOrder) && $scope.productappReach) ||
	  (!$scope.cartapparelReach && !$scope.productappReach);
  });

  // initial load. start from the kit parent
  Kit.get($routeParams.id).then(kitSuccess);

  function kitSuccess(kit) {
	$scope.LineItem = ($routeParams.lineitemid && $scope.currentOrder) ? $scope.currentOrder.LineItems[$routeParams.lineitemid] : {};
	if ($routeParams.lineitemid) {
	  $scope.kitIndex = $routeParams.lineitemid;
	}
	$scope.LineItem.IsKitParent = true;
	$scope.Kit = kit;
	$scope.allItemsConfigured = false;
	$scope.kitStarted = !!$scope.LineItem.ID; // true when editing an existing order
	$scope.kitItemNames = {};

	// Kit item color restrictions — keyed by kit item ID (not product ID), because
	// the same product can appear twice with different required colors (e.g. one Navy
	// polo + one White polo). Kit item IDs are unique per slot in the kit.
	//
	// HOW TO FIND YOUR KIT ITEM IDs:
	// Open DevTools → Console after loading the kit page. You'll see a table listing
	// each item's name and its kit item ID — copy those IDs in here.
	$scope.kitColorRestrictions = {
	  'VlPd8MwMsH84Td9aRWBw9w-e-e': 'Navy',
	  // 'PASTE-KIT-ITEM-ID-FOR-WHITE-POLO':  'White',
	  // 'PASTE-KIT-ITEM-ID-FOR-FLEECE':      'Navy'
	};

	// Log kit item IDs — open DevTools Console then reload to see these.
	console.log('=== KIT ITEM IDs — paste these into kitColorRestrictions ===');
	angular.forEach(kit.KitItems, function(ki, i) {
	  console.log(
		'Item ' + (i + 1) + ':',
		(ki.LineItem && ki.LineItem.Product && ki.LineItem.Product.ExternalID) || 'unknown',
		'| Qty:', ki.Quantity,
		'| ID:', ki.ID
	  );
	});
	console.log('=============================================================');

	// Returns a filter function for the variant list, keyed by kit item ID.
	$scope.getVariantColorFilter = function(kitItemId) {
	  var color = $scope.kitColorRestrictions[kitItemId];
	  if (!color) return undefined; // no restriction — show all variants
	  return function(v) {
		return v.ExternalID && v.ExternalID.toLowerCase().indexOf(color.toLowerCase()) !== -1;
	  };
	};

	// Pre-load human-readable names for each kit item.
	// The kit API returns sparse product data (often just IDs), so we fetch
	// each product individually to get the real Name field.
	angular.forEach(kit.KitItems, function(kitItem) {
	  var interopID = kitItem.LineItem && kitItem.LineItem.Product && kitItem.LineItem.Product.InteropID;
	  if (!interopID) return;
	  ProductDisplayService.getProductAndVariant(interopID, null, function(data) {
		if (data && data.product) {
		  var name = data.product.Name || data.product.ExternalID || '';
		  if (name) $scope.kitItemNames[kitItem.ID] = name;
		}
	  }, 1, 1);
	});

	setupProduct(kit.KitParent, null, null, function() {
	  // Save parent reference immediately so returnToParent() can restore it later.
	  // Must happen before anything else reassigns $scope.LineItem.
	  $scope.kitParentLineItem = $scope.LineItem;

	  // Pre-fill the quantity field with the admin-configured default price break
	  // (PriceSchedule.DefaultQuantity is only set when a price break is flagged
	  // Default) so the shopper doesn't have to re-select it before starting the kit.
	  if (!$scope.LineItem.ID && $scope.LineItem.PriceSchedule && $scope.LineItem.PriceSchedule.DefaultQuantity) {
		$scope.LineItem.Quantity = $scope.LineItem.PriceSchedule.DefaultQuantity;
	  }
	  $scope.isGiftKit = kitIsGift();
	  $scope.kitSkipQuantity = $scope.isGiftKit;
	  setGiftKitQuantity();

	  if ($scope.LineItem.ID) {
		$scope.addToOrderText = 'Add to Cart';
		Kit.mapKitToOrder($scope.Kit, $scope.LineItem);
		checkAllConfigured();
		// Track whether the kit was fully configured when the user arrived.
		// Used in saveItem() to decide: go to cart (first completion) vs return
		// to the parent summary (re-editing an already-complete kit).
		$scope.kitWasCompleteOnEntry = $scope.allItemsConfigured;
		var newVariant = store.get("kitItem");
		var newVariantId = store.get("kitNewVariant");
		if (newVariantId) store.remove("kitNewVariant");

		if (newVariant) {
		  angular.forEach($scope.Kit.KitItems, function(item) {
			if (item.LineItem && item.LineItem.Product && item.LineItem.Product.InteropID === newVariant) {
			  store.remove("kitItem");
			  if (newVariantId) {
				// Open the kit item and auto-select the newly created variant
				$scope.LineItem = item.LineItem;
				$scope.LineItem.Quantity = item.Quantity;
				$scope.ActiveKitItem = item;
				ProductDisplayService.getProductAndVariant(
				  item.LineItem.Product.InteropID,
				  newVariantId,
				  function(data) {
					$scope.LineItem.Product = data.product;
					ProductDisplayService.setNewLineItemScope($scope);
					ProductDisplayService.setProductViewScope($scope);
					$scope.setAddToOrderErrors();
					$scope.allowAddToOrder = true;
					if (data.variant) {
					  selectVariant(data.variant);
					}
				  },
				  1, $scope.settings.pageSize
				);
			  } else {
				setCurrent(item);
			  }
			}
		  });
		} else if (!$scope.kitWasCompleteOnEntry) {
		  // Auto-advance to the first unconfigured item so the user lands directly
		  // on the first thing they need to fill out rather than the summary view.
		  var firstUnconfigured = null;
		  angular.forEach($scope.Kit.KitItems, function(item) {
			if (!firstUnconfigured && item.LineItem && item.LineItem.IsConfigurable && !item.LineItem.IsConfigured) {
			  firstUnconfigured = item;
			}
		  });
		  if (firstUnconfigured) setCurrent(firstUnconfigured);
		}
	  }
	});
  }

  function checkAllConfigured() {
	if (!$scope.Kit || !$scope.Kit.KitItems) return;
	var allDone = true;
	angular.forEach($scope.Kit.KitItems, function(item) {
	  if (item.LineItem && item.LineItem.IsConfigurable && !item.LineItem.IsConfigured) {
		allDone = false;
	  }
	});
	$scope.allItemsConfigured = allDone;
  }

  $scope.saveOrder = saveOrder;
  $scope.saveKitItem = saveItem;
  $scope.setItemAsCurrent = setCurrent;
  $scope.calcVariantLineItems = calcVariantLineItems;
  $scope.selectVariant = selectVariant;
  $scope.searchVariants = searchVariants;
  $scope.addKitToCart = addKitToCart;
  $scope.returnToParent = returnToParent;
  $scope.$watch('settings.currentPage', changePage);

  // Inline create/choose state
  $scope.designMode = null;
  $scope.inlineVariant = null;
  $scope.inlineVariantErrors = [];
  $scope.showInlineVariantErrors = false;
  $scope.inlineVariantSaving = false;
  $scope.editVariantFull = null;

  $scope.isPhoneSpec = function(spec) {
	if (!spec) return false;
	var name = (spec.Name || '').toLowerCase();
	var label = (spec.Label || '').toLowerCase();
	return name.indexOf('phone') > -1 || label.indexOf('phone') > -1;
  };

  // Live-formats a phone spec's value into xxx-xxx-xxxx as the user types.
  // Implemented by hand (rather than the bundled ui-mask lib) since ui-mask
  // fights with a dynamic placeholder attribute on the same input -- it reuses
  // the placeholder string as its blank-slot character template, so a label
  // like "Phone" gets consumed character-by-character into the mask overlay.
  $scope.formatPhoneSpec = function(spec) {
	if (!spec || spec.Value == null) return;
	var digits = ('' + spec.Value).replace(/\D/g, '').substring(0, 10);
	var formatted = digits;
	if (digits.length > 6) {
	  formatted = digits.substring(0, 3) + '-' + digits.substring(3, 6) + '-' + digits.substring(6);
	} else if (digits.length > 3) {
	  formatted = digits.substring(0, 3) + '-' + digits.substring(3);
	}
	if (formatted !== spec.Value) spec.Value = formatted;
  };

  function resetDesignMode() {
	$scope.designMode = null;
	$scope.inlineVariant = null;
	$scope.inlineVariantErrors = [];
	$scope.showInlineVariantErrors = false;
	$scope.inlineVariantSaving = false;
	$scope.editVariantFull = null;
  }

  $scope.setDesignMode = function(mode) {
	$scope.designMode = mode;
	$scope.showInlineVariantErrors = false;
	if (mode === 'create') {
	  // Clear the selected variant AND mark the item as not configured so the
	  // sidebar shows "Action Needed" — user must save a design before proceeding.
	  $scope.LineItem.Variant = null;
	  $scope.LineItem.IsConfigured = false;
	  if ($scope.setAddToOrderErrors) $scope.setAddToOrderErrors();
	  $scope.inlineVariant = { ProductInteropID: $scope.LineItem.Product.InteropID, Specs: {} };
	  angular.forEach($scope.LineItem.Product.Specs, function(spec) {
		if (!spec.CanSetForLineItem) {
		  $scope.inlineVariant.Specs[spec.Name] = angular.copy(spec);
		  $scope.inlineVariant.Specs[spec.Name].Value = spec.Value || '';
		}
	  });
	} else if (mode === 'edit') {
	  $scope.editVariantFull = null;
	  // Pre-populate from the currently selected variant so the user edits in place.
	  // InteropID is preserved so Variant.save() updates rather than creates.
	  $scope.inlineVariant = {
		InteropID: $scope.LineItem.Variant.InteropID,
		ProductInteropID: $scope.LineItem.Product.InteropID,
		Specs: {}
	  };
	  angular.forEach($scope.LineItem.Product.Specs, function(spec) {
		if (!spec.CanSetForLineItem) {
		  $scope.inlineVariant.Specs[spec.Name] = angular.copy(spec);
		  var existingSpec = $scope.LineItem.Variant.Specs && $scope.LineItem.Variant.Specs[spec.Name];
		  $scope.inlineVariant.Specs[spec.Name].Value = (existingSpec && existingSpec.Value != null) ? existingSpec.Value : (spec.Value || '');
		}
	  });
	  // Fetch full variant to get PreviewUrl, LargeImageUrl, ProofUrl AND the
	  // authoritative saved spec values — the list objects only carry basic fields.
	  ProductDisplayService.getProductAndVariant(
		$scope.LineItem.Product.InteropID,
		$scope.LineItem.Variant.InteropID,
		function(data) {
		  if (data && data.variant) {
			$scope.editVariantFull = data.variant;
			// Patch inlineVariant.Specs with the actual saved values from the full
			// variant fetch. The initial population above uses LineItem.Variant.Specs
			// which is often empty (list objects carry only basic fields), so required
			// spec fields appear blank and block saveInlineVariant validation.
			if (data.variant.Specs && $scope.inlineVariant && $scope.inlineVariant.Specs) {
			  angular.forEach($scope.inlineVariant.Specs, function(spec, key) {
				var savedSpec = data.variant.Specs[key];
				if (savedSpec && savedSpec.Value != null) spec.Value = savedSpec.Value;
			  });
			}
		  }
		},
		1, 1
	  );
	} else {
	  $scope.inlineVariant = null;
	  $scope.inlineVariantErrors = [];
	  // Re-run error validation so Save & Continue reflects the current variant
	  // selection state after exiting create/edit/choose mode.
	  if ($scope.setAddToOrderErrors) $scope.setAddToOrderErrors();
	}
  };

  $scope.$watch('inlineVariant.Specs', function() {
	if (!$scope.inlineVariant) return;
	var errs = [];
	angular.forEach($scope.inlineVariant.Specs, function(s) {
	  if (s.Required && !s.Value) errs.push((s.Label || s.Name) + ' is required');
	});
	$scope.inlineVariantErrors = errs;
  }, true);

  $scope.saveInlineVariant = function() {
	if ($scope.inlineVariantErrors.length) {
	  $scope.showInlineVariantErrors = true;
	  return;
	}
	$scope.inlineVariantSaving = true;
	var isEditing = !!$scope.inlineVariant.InteropID;
	Variant.save($scope.inlineVariant, function(data) {
	  $scope.inlineVariantSaving = false;
	  var savedVariantId = data.InteropID;
	  resetDesignMode();
	  $scope.settings.currentPage = 1;
	  if (isEditing) {
		// For edits, update LineItem.Variant in place rather than calling setupProduct.
		// setupProduct runs setNewLineItemScope which resets LineItem.Specs (the
		// non-variant specs from kitaddtoorderspecs), causing setAddToOrderErrors to
		// report errors that leave the Save & Continue button disabled even though
		// the variant is correctly saved and selected.
		selectVariant(angular.extend({}, $scope.LineItem.Variant, data));
	  } else {
		// For new variants, full re-initialization is needed so the variants list
		// and line item scope are set up correctly for the newly created variant.
		setupProduct(
		  $scope.LineItem.Product,
		  { InteropID: savedVariantId },
		  null,
		  function(setupData) {
			if (setupData && setupData.variant) selectVariant(setupData.variant);
		  }
		);
	  }
	}, function() {
	  $scope.inlineVariantSaving = false;
	  $scope.showInlineVariantErrors = true;
	  $scope.inlineVariantErrors = ['There was a problem saving your design. Please try again.'];
	});
  };

  function changePage(n, o) {
	if (!$scope.LineItem) return;
	if (n != o || (n == 1 && o == 1))
	  setupProduct($scope.LineItem.Product, null, $scope.searchTerm);
  }

  function searchVariants(searchTerm) {
	$scope.searchTerm = searchTerm;
	$scope.settings.currentPage == 1 ?
	  setupProduct($scope.LineItem.Product, null, searchTerm) :
	  $scope.settings.currentPage = 1;
  }

  function selectVariant(variant) {
	angular.forEach($scope.LineItem.Product.Variants, function(v) {
	  if (v.Selected) v.Selected = false;
	});
	variant.Selected = true;
	$scope.LineItem.Variant = variant;
	// Close whichever design panel is open and re-run error validation so the
	// save button becomes enabled as soon as the user picks a design.
	resetDesignMode();
	if ($scope.setAddToOrderErrors) $scope.setAddToOrderErrors();
  }

  function setCurrent(item) {
	if (!item.LineItem.IsConfigurable) return;
	resetDesignMode();
	if ($scope._colorWatchDeregister) { $scope._colorWatchDeregister(); $scope._colorWatchDeregister = null; }
	var _interopID = item.LineItem.Product && item.LineItem.Product.InteropID;
	// Preserve any previously saved user-selected variant (e.g. a business card design)
	// so it's still selected when the user comes back to edit. IsDefaultVariant means
	// nothing real was chosen yet.
	var _savedVariant = (item.LineItem.Variant &&
						 item.LineItem.Variant.InteropID &&
						 !item.LineItem.Variant.IsDefaultVariant)
						? item.LineItem.Variant : null;
	$scope.LineItem = item.LineItem;
	$scope.LineItem.Quantity = item.Quantity;
	$scope.LineItem.Variant = null; // clear image immediately; restored in setupProduct callback
	// Replace product with a stub so the previous item's image clears right away.
	$scope.LineItem.Product = { InteropID: _interopID };
	$scope.allowAddToOrder = false; // hide Save button until product + variant fully load
	$scope.ActiveKitItem = item;
	console.log('Kit item clicked | ID:', item.ID, '| Color restriction:', $scope.kitColorRestrictions[item.ID] || 'none');
	// "Last item" = all OTHER configurable items are already configured.
	var unconfiguredOthers = 0;
	angular.forEach($scope.Kit.KitItems, function(ki) {
	  if (ki.ID !== item.ID && ki.LineItem && ki.LineItem.IsConfigurable && !ki.LineItem.IsConfigured) {
		unconfiguredOthers++;
	  }
	});
	$scope.isLastConfigurableItem = (unconfiguredOthers === 0);
	// Pass the saved variant so getProductAndVariant fetches it, then re-select it
	// in the success callback once the full product data is available.
	setupProduct($scope.LineItem.Product, _savedVariant, null, function(data) {
	  if (_savedVariant && data && data.variant) {
		selectVariant(data.variant);
	  }
	});
  }

  function setupProduct(product, variant, searchTerm, success) {
	// have to empty this because the scope is held in the service singleton and inherits any previous variants
	$scope.variantLineItems = null;
	ProductDisplayService.getProductAndVariant(product.InteropID, variant ? variant.InteropID : null, function(data) {
	  $scope.LineItem.Product = data.product;
	  //$scope.LineItem.Variant = data.variant; // should never be a variant
	  ProductDisplayService.setNewLineItemScope($scope);
	  ProductDisplayService.setProductViewScope($scope);
	  if ($scope.variantLineItems) {
		angular.forEach($scope.variantLineItems, function(li) {
		  li.Quantity = $scope.LineItem.Quantity;
		});
	  }
	  $scope.setAddToOrderErrors();
	  $scope.allowAddToOrder = true;

	  // Color restriction: hide the Color form field in the spec form and show a
	  // locked badge in the UI instead. Set the spec value on the scope so it saves.
	  $scope.kitLockedColor = null;
	  if ($scope.ActiveKitItem && $scope.kitColorRestrictions) {
		var _color = $scope.kitColorRestrictions[$scope.ActiveKitItem.ID];

		if ($scope._colorWatchDeregister) { $scope._colorWatchDeregister(); $scope._colorWatchDeregister = null; }

		if (_color) {
		  $scope.kitLockedColor = _color;

		  // Set the scope spec value (try common key names + scan Product.Specs)
		  var _colorSpecKey = 'Color';
		  angular.forEach($scope.LineItem.Product && $scope.LineItem.Product.Specs, function(spec, key) {
			if (key.indexOf('$') !== 0 && spec.Options) {
			  angular.forEach(spec.Options, function(o) {
				if (o.Value && o.Value.toLowerCase().indexOf(_color.toLowerCase()) !== -1) _colorSpecKey = key;
			  });
			}
		  });
		  angular.forEach(['Color', 'color', 'Colour', 'colour', _colorSpecKey], function(k) {
			if ($scope.LineItem.Specs && $scope.LineItem.Specs[k]) {
			  $scope.LineItem.Specs[k].Value = _color;
			}
		  });

		  // $watch backup: snap the value back if the hidden field somehow changes
		  var _wk = _colorSpecKey, _wc = _color;
		  $scope._colorWatchDeregister = $scope.$watch('LineItem.Specs.' + _wk + '.Value', function(v) {
			if (v && v !== _wc && $scope.LineItem.Specs && $scope.LineItem.Specs[_wk]) {
			  $scope.LineItem.Specs[_wk].Value = _wc;
			}
		  });

		  // Hide the Color label+field row inside the kitaddtoorderspecs directive
		  var _hc = _color, _ht = 0;
		  function _hideColorField() {
			_ht++;
			var el = document.querySelector('kitaddtoorderspecs');
			if (!el && _ht < 20) { $timeout(_hideColorField, 150); return; }
			if (!el) return;
			var labels = el.querySelectorAll('label');
			var hidden = false;
			for (var i = 0; i < labels.length; i++) {
			  var txt = (labels[i].textContent || labels[i].innerText || '').trim().toLowerCase();
			  if (txt.indexOf('color') !== -1 || txt.indexOf('colour') !== -1) {
				// Walk up to the nearest containing block (form-group or div)
				var node = labels[i].parentElement;
				if (node) { node.style.display = 'none'; hidden = true; }
				break;
			  }
			}
			if (!hidden && _ht < 20) $timeout(_hideColorField, 150);
		  }
		  $timeout(_hideColorField, 150);
		}
	  }

	  if (success) success(data);
	}, $scope.settings.currentPage, $scope.settings.pageSize, searchTerm);
  }

  // Restore the parent (kit summary) view without navigating away.
  // Used after saving the last item and when re-editing a complete kit.
  function returnToParent() {
	resetDesignMode();
	if ($scope._colorWatchDeregister) { $scope._colorWatchDeregister(); $scope._colorWatchDeregister = null; }
	$scope.kitLockedColor = null;
	$scope.ActiveKitItem = null;
	$scope.isLastConfigurableItem = false;
	if ($scope.kitParentLineItem) {
	  $scope.LineItem = $scope.kitParentLineItem;
	}
	$scope.LineItem.IsKitParent = true;
	checkAllConfigured();
	var parentProduct = ($scope.kitParentLineItem && $scope.kitParentLineItem.Product) || $scope.Kit.KitParent;
	setupProduct(parentProduct, null);
  }

  // Navigate to cart — only called once all items are configured and the
  // user explicitly clicks "Add to Cart" from the parent summary view.
  function addKitToCart() {
	$location.path('/cart');
  }

  function calcVariantLineItems() {
	$scope.variantLineItemsOrderTotal = 0;
	angular.forEach($scope.variantLineItems, function(item) {
	  $scope.variantLineItemsOrderTotal += item.LineTotal || 0;
	});
  }

  function saveOrder() {
	if ($scope.currentOrder) {
	  console.log('working ')
	  if ($scope.productappPO === false && $scope.cartapparelPO === true) {
		alert("This item can not be combined with MMThreads, Sales Kits, or Collateral Pieces.");
		$location.path('/cart');
		return;
	  } else if ($scope.productappPO === true && $scope.cartapparelPO === false) {
		alert("This item can not be combined with MMThreads, Sales Kits, or Collateral Pieces.");
		$location.path('/cart');
		return;
	  } else if ($scope.productappReach === false && $scope.cartapparelReach === true) {
		alert("This item can not be combined with other items.");
		$location.path('/cart');
		return;
	  }
	}
	$scope.addToOrderIndicator = true;
	$scope.showAddToCartErrors = false;

	if ($scope.lineItemErrors && $scope.lineItemErrors.length) {
	  $scope.showAddToCartErrors = true;
	  $scope.addToOrderIndicator = false;
	  return;
	}

	$scope.currentOrder = $scope.currentOrder || {};
	$scope.currentOrder.LineItems = $scope.currentOrder.LineItems || [];


	// Safety net: a new gift kit always goes in at a quantity of 1.
	if ($scope.isGiftKit && !$scope.LineItem.ID && $scope.LineItem === $scope.kitParentLineItem) $scope.LineItem.Quantity = 1;

	var msg = User.giftItemCheck($scope.user,$scope.currentOrder.LineItems,$scope.LineItem);
	if(msg){
		$scope.showAddToCartErrors = true;
		$scope.addToOrderIndicator = false;
		alert(msg);
		return;
	}


	if (!$scope.LineItem.ID)
	  $scope.currentOrder.LineItems.push($scope.LineItem);

	$scope.currentOrder.Type = $scope.LineItem.PriceSchedule.OrderType;
	Kit.saveOrder($scope.currentOrder, success, fail);

	function success(order) {
	  $scope.currentOrder = order;
	  $scope.kitIndex = $routeParams.lineitemid ? $routeParams.lineitemid : $scope.currentOrder.LineItems.length - 1;
	  var currentLineItem = order.LineItems[$scope.kitIndex];
	  Kit.mapKitToOrder($scope.Kit, currentLineItem);
	  $scope.user.CurrentOrderID = order.ID;
	  $scope.kitStarted = true;
	  User.save($scope.user, function() {
		$scope.addToOrderIndicator = false;
		if (!$scope.Kit.KitHasConfigurableItems) {
		  $location.path('/cart');
		} else {
		  $location.path('/kit/' + $routeParams.id + "/" + $scope.kitIndex);
		}
	  });
	  setupProduct(currentLineItem.Product, currentLineItem.Variant);
	}

	function fail(ex) {
	  $scope.addToOrderIndicator = false;
	  $scope.lineItemErrors.push(ex.Detail);
	  $scope.showAddToCartErrors = true;
	}
  }

  function saveItem() {
	$scope.addToOrderIndicator = true;
	$scope.showAddToCartErrors = false;

	Order.save($scope.currentOrder, success, error);

	function success(order) {
	  $scope.kitIndex = $routeParams.lineitemid ? $routeParams.lineitemid : $scope.currentOrder.LineItems.length - 1;
	  $scope.currentOrder = order;
	  $scope.addToOrderIndicator = false;
	  $scope.lineItemErrors = null;
	  Kit.mapKitToOrder($scope.Kit, order.LineItems[$scope.kitIndex]);
	  checkAllConfigured();

	  // Auto-advance to the next unconfigured item
	  var nextItem = null;
	  angular.forEach($scope.Kit.KitItems, function(item) {
		if (!nextItem && item.LineItem && item.LineItem.IsConfigurable && !item.LineItem.IsConfigured) {
		  nextItem = item;
		}
	  });

	  if (nextItem) {
		setCurrent(nextItem);
	  } else if ($scope.kitWasCompleteOnEntry) {
		// Re-editing a kit that was already fully configured — return to the
		// summary so the user can review and click "Add to Cart" themselves.
		returnToParent();
	  } else {
		// Just finished configuring the kit for the first time — go straight to cart.
		$location.path('/cart');
	  }
	}

	function error(ex) {
	  $scope.addToOrderIndicator = false;
	  $scope.lineItemErrors.push(ex.Detail);
	  $scope.showAddToCartErrors = true;
	}
  }
}]);