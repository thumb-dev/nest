four51.app.filter('onproperty', ['$451', function($451) {
  var defaults = {
    'OrderStats': 'Type',
    'Message': 'Box'
  };

  return function(input, query) {
    if (!input || input.length === 0) return;
    if (!query) return input;
    query.Property = query.Property || defaults[query.Model];
    return $451.filter(input, query);
  }
}]);

four51.app.filter('kb', function() {
  return function(value) {
    return isNaN(value) ? value : parseFloat(value) / 1024;
  }
});

four51.app.filter('r', ['$sce', 'WhiteLabel', function($sce, WhiteLabel) {
  return function(value) {
    var result = value,
      found = false;
    angular.forEach(WhiteLabel.replacements, function(c) {
      if (found) return;
      if (c.key == value) {
        result = $sce.trustAsHtml(c.value);
        found = true;
      }
    });
    return result;
  }
}]);

four51.app.filter('rc', ['$sce', 'WhiteLabel', function($sce, WhiteLabel) {
  return function(value) {
    var result = value,
      found = false;
    angular.forEach(WhiteLabel.replacements, function(c) {
      if (found) return;
      if (c.key.toLowerCase() == value.toLowerCase()) {
        result = $sce.trustAsHtml(c.value);
        found = true;
      }
    });
    return result;
  }
}]);

four51.app.filter('rl', ['$sce', 'WhiteLabel', function($sce, WhiteLabel) {
  return function(value) {
    var result = value,
      found = false;
    angular.forEach(WhiteLabel.replacements, function(c) {
      if (found) return;
      if (c.key.toLowerCase() == value.toLowerCase()) {
        result = $sce.trustAsHtml(c.value.toLowerCase());
        found = true;
      }
    });
    return result;
  }
}]);

four51.app.filter('noliverates', function() {
  return function(value) {
    var output = [];
    angular.forEach(value, function(v) {
      if (v.ShipperRateType != 'ActualRates')
        output.push(v);
    });
    return output;
  }
});

four51.app.filter('paginate', function() {
  return function(input, start) {
    if (typeof input != 'object' || !input) return;
    start = +start; //parse to int
    return input.slice(start);
  }
});


// The issue is the use of the Large Address Search customization. You only have a limited number of addresses in the shipaddresses array. You will have to have your filter make a direct call to get the address using the currentOrder.ShipAddressID.

four51.app.filter('shipperFilter', ['Address', function(Address) {
  return function(shippers, addresses, currentid, order) {
    var results = [];
    var shipWeight = 0;
    var addressFound = false;
    
    if (order && order.LineItems) {
      angular.forEach(order.LineItems, function(item) {
        var itemWeight = item.Quantity * item.Product.ShipWeight;
        shipWeight += itemWeight;
      });
    }

    // What if there is no custom address?
    Address.get(order.ShipAddressID, function(address) {

    angular.forEach(shippers, function(s) {
      // console.log(`checking shipper: "${addressFound}" "${shipWeight}" "${s.Name}" "${upsGround}"`);
      //console.log('shippers', s.Name)
      if (s.Name.startsWith('UPS Ground')) {
        if (shipWeight < 150) {
          results.push(s);
        }
      } else if (s.Name == 'Bulk Shipping (over 150 lbs)') {
          if (shipWeight >= 150) {
            // console.log('states, over weight');
            results.push(s);
          }
      }
    });    
  });
    // console.log('results', results);
    return results;
  }
}]);

(function() {
  // GIFT ITEMS
  // A product is a gift item when either:
  //   1. it is in a gift category: nest_nhk (New Hire) or nest_ag (Anniversary), or
  //   2. it has a static spec group named "GiftItem" (case, spaces and punctuation
  //      ignored). An "Item" spec of "false" in that group turns it off.
  // Gift items never show a price, and an order containing one hides its totals.
  // four51.isGiftProduct / four51.giftType are shared with the cart, checkout and
  // gift eligibility checks so everything agrees on what a gift item is.
  var GIFT_CATEGORIES = { nest_nhk: 'New Hire', nest_ag: 'Anniversary' };
  var GIFT_CATEGORY_PATH = /^\/catalog\/(nest_nhk|nest_ag)(\/|$)/i;
  var giftProductCategory = {}; // product InteropID -> gift category

  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  function giftItemGroup(product) {
    var groups = product && product.StaticSpecGroups, found = null;
    if (!groups || typeof groups !== 'object') return null;
    angular.forEach(groups, function(g, key) {
      if (found || !g || key === 'VisibleSpecGroups') return;
      if (norm(key).indexOf('giftitem') === 0 || norm(g.Name).indexOf('giftitem') === 0) found = g;
    });
    return found;
  }
  function specIsGift(product) {
    var g = giftItemGroup(product);
    if (!g) return false;
    var item = g.Specs && g.Specs.Item;
    return !(item && String(item.Value).toLowerCase() === 'false');
  }
  function isGiftProduct(product) {
    return !!product && (!!giftProductCategory[product.InteropID] || specIsGift(product));
  }
  // "New Hire", "Anniversary" or null. The spec's Type wins if it is set.
  function giftType(product) {
    var g = giftItemGroup(product);
    if (g && g.Specs && g.Specs.Type && g.Specs.Type.Value) return g.Specs.Type.Value;
    return (product && GIFT_CATEGORIES[giftProductCategory[product.InteropID]]) || null;
  }
  four51.giftItemGroup = giftItemGroup;
  four51.isGiftProduct = isGiftProduct;
  four51.giftType = giftType;

  // Loads the product IDs in the gift categories once per page load.
  // Four51Ctrl calls load() after login; the filters call it too, just in case.
  four51.app.factory('GiftItems', ['$resource', '$451', function($resource, $451) {
    var started = false;
    function loadCategory(category, page) {
      $resource($451.api('Products')).get({ CategoryInteropID: category, SearchTerms: '', Page: page, PageSize: 100 }).$promise.then(function(data) {
        var list = (data && data.List) || [];
        angular.forEach(list, function(p) {
          if (p && p.InteropID) giftProductCategory[p.InteropID] = category;
        });
        if (list.length && data.Count > page * 100) loadCategory(category, page + 1);
      });
    }
    return {
      load: function() {
        if (started) return;
        started = true;
        angular.forEach(GIFT_CATEGORIES, function(type, category) { loadCategory(category, 1); });
      }
    };
  }]);

  // Usage: ng-if="!(LineItem.Product | giftitem)"
  // Everything listed on a gift category page counts as a gift item.
  four51.app.filter('giftitem', ['$location', 'GiftItems', function($location, GiftItems) {
    return function(product) {
      GiftItems.load();
      return isGiftProduct(product) || GIFT_CATEGORY_PATH.test($location.path());
    };
  }]);

  // True when an order (cart) contains a gift item. Gift items can't be combined
  // with other items, so a gift order's totals are hidden too.
  // Usage: ng-if="!(currentOrder | giftorder)"
  four51.app.filter('giftorder', ['GiftItems', function(GiftItems) {
    return function(order) {
      var items = order && order.LineItems;
      if (!items) return false;
      GiftItems.load();
      for (var i = 0; i < items.length; i++) {
        if (isGiftProduct(items[i].Product)) return true;
      }
      return false;
    };
  }]);
})();
