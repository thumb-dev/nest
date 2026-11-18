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
  // Gift items (products in the "GiftItem" static spec group) never show a price.
  // Usage: ng-if="!(LineItem.Product | giftitem)"
  // Products listed on the gift category pages count as gift items even when the
  // list data doesn't include spec groups.
  var GIFT_CATEGORY_PATH = /^\/catalog\/(nest_nhk|nest_ag)(\/|$)/i;
  function isGiftProduct(product) {
    return !!(product && product.StaticSpecGroups && product.StaticSpecGroups.GiftItem);
  }
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
