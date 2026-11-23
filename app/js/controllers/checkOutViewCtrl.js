four51.app.controller('CheckOutViewCtrl', ['$scope', '$routeParams', '$location', '$filter', '$rootScope', '$451', 'User', 'Order', 'OrderConfig', 'FavoriteOrder', 'AddressList', 'GoogleAnalytics',
function ($scope, $routeParams, $location, $filter, $rootScope, $451, User, Order, OrderConfig, FavoriteOrder, AddressList, GoogleAnalytics) {
	$scope.errorSection = 'open';

	$scope.isEditforApproval = $routeParams.id != null && $scope.user.Permissions.contains('EditApprovalOrder');
	if ($scope.isEditforApproval) {
		Order.get($routeParams.id, function(order) {
			$scope.currentOrder = order;
		});
	}

	if (!$scope.currentOrder) {
		$location.path('catalog');
	}

	$scope.hasOrderConfig = OrderConfig.hasConfig($scope.currentOrder, $scope.user);
	$scope.checkOutSection = $scope.hasOrderConfig ? 'order' : 'shipping';

	// Gift redemption: when an order has a gift item (a kit counts by its parent product),
	// record today's date as "ordered" in the user's Nest_Newhire_Date field, e.g.
	// {"date":"2026-03-10","ordered":"2026-11-23"}. That stops the gift pop-up and blocks a
	// second gift until the next work anniversary (see User.giftItemType).
	function giftField(user) {
		var field = null;
		angular.forEach(user && user.CustomFields, function(f) {
			if (!field && f.Name == 'Nest_Newhire_Date') field = f;
		});
		return field;
	}
	function giftFieldValue(user) {
		var f = giftField(user);
		return f ? f.Value : null;
	}
	function markGiftOrdered(user, orders) {
		var field = giftField(user), hasGift = false, history = null, d;
		angular.forEach(orders, function(o) {
			angular.forEach(o && o.LineItems, function(li) {
				if (!hasGift && li && four51.isGiftProduct(li.Product)) hasGift = true;
			});
		});
		if (!hasGift) return false;
		if (!field) {
			console.warn('Gift redeemed, but this user has no Nest_Newhire_Date field to record it in.');
			return false;
		}
		try { history = JSON.parse(field.Value); } catch (e) {}
		if (!history || history.constructor != Object) history = {};
		d = new Date();
		history.ordered = d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
		field.Value = JSON.stringify(history);
		return true;
	}

	function submitOrder() {
		$scope.displayLoadingIndicator = true;
		$scope.submitClicked = true;
		$scope.errorMessage = null;
		Order.submit($scope.currentOrder,
			function(data) {
				var submitted = $scope.currentOrder;
				var giftRedeemed = markGiftOrdered($scope.user, [submitted, data]);

				if ($scope.user.Company.GoogleAnalyticsCode) {
					GoogleAnalytics.ecommerce(data, $scope.user);
				}
				$scope.user.CurrentOrderID = null;

				// Save the user (with the gift "ordered" date) BEFORE leaving checkout. The next
				// page reloads the user from the browser cache, which is only updated once this
				// save finishes; leaving early brought back the copy without "ordered".
				User.save($scope.user, function(u) {
					if (giftRedeemed) {
						var saved = giftFieldValue(u);
						if (saved && saved.indexOf('"ordered"') > -1)
							console.log('Gift redeemed. Nest_Newhire_Date is now ' + saved);
						else
							console.warn('Gift redeemed, but 451 did not keep the ordered date. Nest_Newhire_Date is ' + saved + '. Check the field can be changed by the user in 451 admin.');
					}
					leave();
				}, function(err) {
					console.error('Could not save the gift ordered date to Nest_Newhire_Date:', err);
					leave();
				});
				function leave() {
					$scope.displayLoadingIndicator = false;
					$scope.currentOrder = null;
					$location.path('/order/new/' + data.ID);
				}
			},
			function(ex) {
				$scope.submitClicked = false;
				$scope.errorMessage = ex.Message;
				$scope.displayLoadingIndicator = false;
				$scope.shippingUpdatingIndicator = false;
				$scope.shippingFetchIndicator = false;
			}
		);
	};

	$scope.$watch('currentOrder.CostCenter', function() {
		OrderConfig.address($scope.currentOrder, $scope.user);
	});

	$scope.$watch('currentOrder.LineItems',function(item){
		if(!item)return;
		if($scope.user.ShipMethod && $scope.user.ShipMethod.DefaultShipperAccountNumber){
			angular.forEach($scope.currentOrder.LineItems, function(li){
				li.ShipAccount = $scope.user.ShipMethod.DefaultShipperAccountNumber;
			});
		}
	});

	$scope.$watch('currentOrder.LineItems[0].ShipAccount',function(val){
		if(!val)return;
		if(!$scope.currentOrder.IsMultipleShip()){
			angular.forEach($scope.currentOrder.LineItems, function(li){
				li.ShipAccount = val;
			});
		}
	});

	function saveChanges(callback) {
		$scope.displayLoadingIndicator = true;
		$scope.errorMessage = null;
		$scope.actionMessage = null;
		var auto = $scope.currentOrder.autoID;
		var cache = angular.copy($scope.currentOrder);
		Order.save($scope.currentOrder,
			function(data) {
				$scope.currentOrder = data;
				if(cache.CreditCard){
					$scope.currentOrder.CreditCard = cache.CreditCard;
				}
				if(cache.ExternalOrderDetailRecipients){
					$scope.currentOrder.ExternalOrderDetailRecipients = cache.ExternalOrderDetailRecipients;
				}
				if (auto) {
					$scope.currentOrder.autoID = true;
					$scope.currentOrder.ExternalID = 'auto';
				}
				$scope.displayLoadingIndicator = false;
				if (callback) callback($scope.currentOrder);
				else{
					$scope.actionMessage = "Your changes have been saved";
				}
			},
			function(ex) {
				$scope.currentOrder.ExternalID = null;
				$scope.errorMessage = ex.Message;
				$scope.displayLoadingIndicator = false;
				$scope.shippingUpdatingIndicator = false;
				$scope.shippingFetchIndicator = false;
			}
		);
	};

	$scope.continueShopping = function() {
		if (confirm('Do you want to save changes to your order before continuing?') == true)
			saveChanges(function() { $location.path('catalog') });
		else
			$location.path('catalog');
	};

	$scope.cancelOrder = function() {
		if (confirm('Are you sure you wish to cancel your order?') == true) {
			$scope.displayLoadingIndicator = true;
			Order.delete($scope.currentOrder,
				function() {
					$scope.user.CurrentOrderID = null;
					$scope.currentOrder = null;
					User.save($scope.user, function(data) {
						$scope.user = data;
						$scope.displayLoadingIndicator = false;
						$location.path('catalog');
					});
				},
				function(ex) {
					$scope.actionMessage = ex.Message;
					$scope.displayLoadingIndicator = false;
				}
			);
		}
	};

	$scope.saveChanges = function() {
		saveChanges();
	};

	$scope.submitOrder = function() {
		$scope.submitClicked = true;
		saveChanges(function(data){
			submitOrder();
		});
	};

	$scope.saveFavorite = function() {
		FavoriteOrder.save($scope.currentOrder);
	};

	$scope.cancelEdit = function() {
		$location.path('order');
	};
}]);
