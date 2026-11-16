four51.app.factory('User', ['$q', '$rootScope', '$resource', '$451', 'Security', 'Error', function($q, $rootScope, $resource, $451, Security, Error) {
	var _cacheName = '451Cache.User.' + $451.apiName;
	function _then(fn, data) {
		if (angular.isFunction(fn))
			fn(data);
	}

	function _extend(u) {
		u.Permissions.contains = function(value) {
			return $451.contains(u.Permissions, value);
		};
		if ($451.contains(u.Permissions, ['PayByVisa', 'PayByMasterCard', 'PayByAmex', 'PayByDiscover', 'PayByDinersClub', 'PayByJCB', 'PayByDelta', 'PayBySwitch', 'PayBySolo', 'PayByElectron', 'PayByLaser']))
			u.Permissions.push('PayByCreditCard');

		angular.forEach(u.CustomFields, function(f) {
			if (f.ControlType == 'File' && f.File && f.File.Url.indexOf('auth') == -1)
				f.File.Url += "&auth=" + Security.auth();
		});
		if(u.Company.POIDMask){
			u.Company.POIDMask = u.Company.POIDMask.toUpperCase();
		}
	}

	var _refresh = function() {
		store.remove(_cacheName);
		_get();
	};

	var _get = function(success) {
		var user = store.get(_cacheName);
		user ? (function() { _extend(user); _then(success,user); })() :
			$resource($451.api('user')).get().$promise.then(function(u) {
				_extend(u);
				_then(success,u);
				store.set(_cacheName, u);
			});
	};

	var _save = function(user, success, error) {
		$resource($451.api('user')).save(user).$promise.then(
			function(u) {
				_extend(u);
				_then(success,u);
				store.set(_cacheName, u);
			},
			function(ex) {
				if (angular.isFunction(error))
					error(Error.format(ex));
			}
		);
	};

	var _login = function(credentials, success, error) {
		store.clear();
		$resource($451.api('login')).get(credentials).$promise.then(
			function(u) {
				_then(success,u);
			},
			function(ex) {
				if (angular.isFunction(error))
					error(Error.format(ex));
			}
		);
	};

	var _reset = function(credentials, success, error) {
		store.clear();
		$resource($451.api('login')).save(credentials).$promise.then(
			function(u) {
				if(credentials.CurrentOrderID){
					_setorder(credentials.CurrentOrderID,success,error);
				}
				else{
					_then(success, u);
				}
			},
			function(ex) {
				if (angular.isFunction(error)) {
					error(Error.format(ex));
				}
			}
		)
	};

	var _setorder = function(id, success, error) {
		$resource($451.api('user/currentorder/:id'), { id: '@id' }).save({ id: id }).$promise.then(
			function(data) {
				store.set(_cacheName, data);
				_then(success, data);
			},
			function(ex) {
				if (error)
					error(Error.format(ex));
			}
		);
	};

	var _startneworder = function(user, success, error) {
		user.CurrentOrderID = null;
		$resource($451.api('/user/neworder')).save().$promise.then(
			function(user) {
				store.set(_cacheName, user);
				$rootScope.$broadcast('event:orderUpdate', null);
				_then(success, user);
			},
			function(ex) {
				if (error)
					error(Error.format(ex));
			}
		);
	};

	var _logout = function() {
		store.clear();
		Security.logout();
	};


	var giftItemStart = new Date("2026-11-01");
	var giftItemCheck = function(user,lineItems,lineItem){
	  var msg = false, giftOrder = false, giftItem = lineItem && lineItem.Product && lineItem.Product.StaticSpecGroups && "GiftItem" in lineItem.Product.StaticSpecGroups;

	  if(lineItems.length){
	  	if(lineItems[0].Product && lineItems[0].Product.StaticSpecGroups && "GiftItem" in lineItems[0].Product.StaticSpecGroups){
				giftOrder = true;
			}
			if(giftOrder && giftItem){
				msg = "You may only redeem one gift item.";
			}
			else if(lineItem && giftItem != giftOrder){
				msg = "Gift items can not be combined with other items.";
			}
	  }
	  else if(giftItem){
	  	giftItem = giftItemType(user);
	  	if(lineItem.Product.StaticSpecGroups.GiftItem.Specs && lineItem.Product.StaticSpecGroups.GiftItem.Specs.Type && lineItem.Product.StaticSpecGroups.GiftItem.Specs.Type.Value != giftItem){
	  		msg = "You are not eligible to order this gift item.";
	  	}
	  	else if(1 < +lineItem.Quantity){
	  		msg = "You may only redeeem one gift item.";
	  	}
	  }
	  return msg;
	};

	var giftItemType = function(user){
		var hireDateHistory, date, hireDate = false, orderDate = false, type = false;
		user && user.CustomFields && jQuery.each(user.CustomFields,function(i,el){
			if(el.Name == "TheNestSchoolsHireDateHistory"){
				try{
					hireDateHistory = JSON.parse(el.Value);
				} catch(e){}
				if(hireDateHistory && hireDateHistory.date){
					hireDate = new Date(hireDateHistory.date);
				}
				return false;
			}
		});
		if(hireDate){
			date = new Date();
			date.setUTCMilliseconds(0); date.setUTCSeconds(0); date.setUTCMinutes(0); date.setUTCHours(0);
			if(hireDateHistory.ordered){
				orderDate = new Date(hireDateHistory.ordered);
			}
			if(orderDate){
				hireDate.setUTCFullYear(date.getUTCFullYear());
				if(orderDate < hireDate && hireDate <= date){
					type = "Anniversary";
				}
			}
			else{
				if(hireDate < giftItemStart){
					hireDate.setUTCFullYear(date.getUTCFullYear());
					if(giftItemStart <= hireDate && hireDate <= date){
						type = "Anniversary";
					}
				}
				else{
					hireDate.setUTCFullYear(hireDate.getUTCFullYear() + 1);
					if(hireDate < date){
						type = "Anniversary";
					}
					else{
						type = "New Hire";
					}
				}
			}
		}
		return type;
	};




	return {
		get: _get,
		login: _login,
		save: _save,
		logout: _logout,
		refresh: _refresh,
		reset: _reset,
		setcurrentorder: _setorder,
		startneworder: _startneworder
		,giftItemCheck:giftItemCheck
		,giftItemType:giftItemType
	};
}]);