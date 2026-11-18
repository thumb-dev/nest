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
  // Gift items never show a price. A product is a gift item when it has a static
  // spec group named "GiftItem". The name match ignores case, spaces and
  // punctuation ("Gift Item", "giftitem", "Gift Items" all count). If the group has
  // an "Item" spec (like HidePrice), a value of "false" turns it off.
  // Shared as four51.giftItemGroup / four51.isGiftProduct so the cart, checkout
  // and gift eligibility checks all agree on what a gift item is.
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
  function isGiftProduct(product) {
    var g = giftItemGroup(product);
    if (!g) return false;
    var item = g.Specs && g.Specs.Item;
    return !(item && String(item.Value).toLowerCase() === 'false');
  }
  four51.giftItemGroup = giftItemGroup;
  four51.isGiftProduct = isGiftProduct;

  // Usage: ng-if="!(LineItem.Product | giftitem)"
  // Products listed on the gift category pages count as gift items even when the
  // list data doesn't include spec groups.
  var GIFT_CATEGORY_PATH = /^\/catalog\/(nest_nhk|nest_ag)(\/|$)/i;
  four51.app.filter('giftitem', ['$location', function($location) {
    return function(product) {
      return isGiftProduct(product) || GIFT_CATEGORY_PATH.test($location.path());
    };
  }]);

  // True when an order (cart) contains a gift item. Gift items can't be combined
  // with other items, so a gift order's totals are hidden too.
  // Usage: ng-if="!(currentOrder | giftorder)"
  four51.app.filter('giftorder', function() {
    return function(order) {
      var items = order && order.LineItems;
      if (!items) return false;
      for (var i = 0; i < items.length; i++) {
        if (isGiftProduct(items[i].Product)) return true;
      }
      return false;
    };
  });
})();
