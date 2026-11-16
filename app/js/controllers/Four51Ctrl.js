four51.app.controller('Four51Ctrl', ['$scope', '$route', '$timeout', '$location', '$modal', 'Punchout', '$451', 'User', 'Order', 'Security', 'OrderConfig', 'Category', 'AppConst','XLATService', 'GoogleAnalytics', 'SpendingAccount',
function ($scope, $route, $timeout, $location, $modal, Punchout, $451, User, Order, Security, OrderConfig, Category, AppConst, XLATService, GoogleAnalytics, SpendingAccount) {
	$scope.AppConst = AppConst;
	$scope.scroll = 0;
	$scope.isAnon = $451.isAnon; //need to know this before we have access to the user object
	$scope.Four51User = Security;
	if ($451.isAnon && !Security.isAuthenticated()) {
		User.login(function () {
			$route.reload();
		});
	}

	// fix Bootstrap fixed-top and fixed-bottom from jumping around on mobile input when virtual keyboard appears
	if ($(window).width() < 960) {
		$(document)
			.on('focus', ':input:not("button")', function (e) {
				$('.navbar-fixed-bottom, .headroom.navbar-fixed-top').css("position", "relative");
			})
			.on('blur', ':input', function (e) {
				$('.navbar-fixed-bottom, .headroom.navbar-fixed-top').css("position", "fixed");
			});
	}

	// http://stackoverflow.com/questions/12592472/how-to-highlight-a-current-menu-item-in-angularjs
	$scope.isActive = function(path) {
		var cur_path = $location.path().replace('/', '');
		var result = false;

		if (path instanceof Array) {
			angular.forEach(path, function(p) {
				if (p == cur_path && !result)
					result = true;
			});
		}
		else {
			if (cur_path == path)
				result = true;
		}
		return result;
	};

		$scope.isActivePartialPath = function(path) {
		var cur_path = $location.path().replace('/', '');
		var result = false;

		if (path instanceof Array) {
				angular.forEach(path, function(p) {
						if ((cur_path.search(p) >= 0) && !result)
								result = true;
				});
		}
		else {
				if (cur_path.search(path) >= 0)
						result = true;
		}
		return result;
};

	// extension of above isActive in path
	$scope.isInPath = function(path) {
		var cur_path = $location.path().replace('/', '');
		var result = false;

		if(cur_path.indexOf(path) > -1) {
			result = true;
		}
		else {
			result = false;
		}
		return result;
	};

	//Punchout
	$scope.PunchoutSession = Punchout.punchoutSession;

	// Gift redemption notice (replaces the old browser confirm() pop-ups)
	var GIFT_NOTICES = {
		"New Hire": {
			title: "Welcome to the Team!",
			message: "You have a new hire gift waiting for you. Would you like to redeem it now?",
			path: "/catalog/GiftItemsNewHire"
		},
		"Anniversary": {
			title: "Happy Work Anniversary!",
			message: "You have an anniversary gift waiting for you. Would you like to redeem it now?",
			path: "/catalog/GiftItemsAnniversary"
		}
	};

	var GIFT_MODAL_TEMPLATE = [
		'<style>',
		'.gift-notice-modal .modal-dialog {width:460px; max-width:calc(100% - 32px); margin:80px auto;}',
		'.gift-notice-modal .modal-content {width:100% !important; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,.25); overflow:hidden;}',
		'.gift-notice-modal .modal-header {position:relative; border-bottom:none; min-height:36px; padding:2px;}',
		'.gift-notice-modal .modal-header a.close {margin:0; padding:0; position:absolute; top:12px; right:16px; font-size:1.4em; color:#242629; opacity:.6; cursor:pointer;}',
		'.gift-notice-modal .modal-header a.close:hover {opacity:1;}',
		'.gift-notice-modal .modal-body {padding:0 36px 12px; text-align:center;}',
		'.gift-notice-modal .gift-notice-icon {display:inline-flex; align-items:center; justify-content:center; width:76px; height:76px; border-radius:50%; background:rgba(0,127,163,.1); color:#007FA3; font-size:34px; margin-bottom:18px;}',
		'.gift-notice-modal h3 {margin:0 0 10px; font-family:"Open Sans", Arial, sans-serif; font-weight:700; color:#242629;}',
		'.gift-notice-modal p {margin:0; font-size:15px; line-height:1.5; color:#55595e;}',
		'.gift-notice-modal .gift-notice-actions {display:flex; gap:12px; justify-content:center; padding:24px 36px 32px;}',
		'.gift-notice-modal .gift-notice-actions .btn {flex:1; padding:11px 16px; border-width:1px;}',
		'.gift-notice-modal .btn-redeem {background:#242629; border-color:#242629; color:#fff; font-family:"Open Sans", Arial, sans-serif; font-weight:bold; letter-spacing:1.35px; text-transform:uppercase; border-radius:4px;}',
		'.gift-notice-modal .btn-redeem:hover, .gift-notice-modal .btn-redeem:focus {background:#007FA3; border-color:#007FA3; color:#fff;}',
		'@media (max-width:767px) {',
		'.gift-notice-modal .modal-dialog {margin:40px auto;}',
		'.gift-notice-modal .modal-body {padding:0 20px 8px;}',
		'.gift-notice-modal .gift-notice-actions {flex-direction:column-reverse; padding:20px 20px 24px;}',
		'}',
		'</style>',
		'<div class="modal-header">',
			'<a class="pull-right close" ng-click="close()" aria-label="Close">',
				'<i class="fa fa-times"></i>',
			'</a>',
		'</div>',
		'<div class="modal-body">',
			'<div class="gift-notice-icon"><i class="fa fa-gift"></i></div>',
			'<h3>{{notice.title}}</h3>',
			'<p>{{notice.message}}</p>',
		'</div>',
		'<div class="gift-notice-actions">',
			'<button type="button" class="btn btn-info" ng-click="later()">Maybe Later</button>',
			'<button type="button" class="btn btn-redeem" ng-click="redeem()">Redeem My Gift</button>',
		'</div>'
	].join('');

	function openGiftModal(notice) {
		var modalInstance = $modal.open({
			backdrop: true,
			keyboard: true,
			windowClass: 'gift-notice-modal',
			template: GIFT_MODAL_TEMPLATE,
			controller: ['$scope', '$modalInstance', 'notice', function ($scope, $modalInstance, notice) {
				$scope.notice = notice;
				$scope.redeem = function () {
					$modalInstance.close(true);
				};
				$scope.later = $scope.close = function () {
					$modalInstance.dismiss('later');
				};
			}],
			resolve: {
				notice: function () {
					return notice;
				}
			}
		});

		modalInstance.result.then(function (redeem) {
			if (redeem) {
				$location.path(notice.path);
			}
		});
	}

	// Load the user fresh from 451 once per page load, so hire date changes made
	// in admin are picked up on reload instead of waiting for a logout/login.
	var userRefreshed = false;

	function init() {
		if (Security.isAuthenticated()) {
			var loadUser = userRefreshed ? User.get : User.refresh;
			userRefreshed = true;
			loadUser(function (user) {
				var hireDate = false, hireDateHistory = false, update = false;
				if(user.Phone && /^\d{4}-\d{2}\-\d{2}/.test(user.Phone)){
					hireDate = new Date(user.Phone.slice(0,10));
					user.Phone = "";
					!!+hireDate && user.CustomFields && jQuery.each(user.CustomFields,function(i,el){
						if(el.Name == "TheNestSchoolsHireDateHistory"){
							try{
								hireDateHistory = JSON.parse(el.Value);
							} catch(e){}
							if(!hireDateHistory || hireDateHistory.constructor != Object){
								hireDateHistory = {};
							}
							if("date" in hireDateHistory){
								hireDateHistory.date = new Date(hireDateHistory.date);
							}
							else{
								hireDateHistory.date = 0;
							}
							if(+hireDateHistory.date != +hireDate){
								hireDateHistory.date = hireDate.getUTCFullYear() + "-" + (hireDate.getUTCMonth() + 1 + "").padStart(2,"0") + "-" + (hireDate.getUTCDate() + "").padStart(2,"0");
								el.Value = JSON.stringify(hireDateHistory);
								update = true;
							}
							return false;
						}
					});
				}
				if(update){
					User.save(user,function(u){
						doInit(u,hireDateHistory);
					});
				}
				else{
					doInit(user,hireDateHistory);
				}

				function doInit(user){
					$scope.user = user;
					$scope.adminMember = false;
					angular.forEach($scope.user.Groups, function(group){
						if(group.Name == "Dashboard"){
							$scope.dashUser = true;
						} else if (group.Name == "Administration") {
							$scope.adminUser = true;
						} else if (group.Name == "HR") {
							$scope.hrUser = true;
						} else if (group.Name == "Sales and Marketing") {
							$scope.salesUser = true;
						} else if (group.Name == "Insights") {
							$scope.insightsUser = true;
						}
					});

					$scope.user.Culture.CurrencyPrefix = XLATService.getCurrentLanguage(user.CultureUI, user.Culture.Name)[1];
					$scope.user.Culture.DateFormat = XLATService.getCurrentLanguage(user.CultureUI, user.Culture.Name)[2];

			//         var setLocation = store.get('locationSet');
			// 		if (!setLocation) {
			// 		  store.set('locationSet', true)
			// 		  $location.path('catalog/adt_shop');
			// 		}

					//Punchout
					var punchoutConfigured = store.get('punchoutconfig');
					if(!punchoutConfigured){
						angular.forEach($scope.user.Permissions,function(permission){
							if(permission == "PunchoutUser"){
								$scope.PunchoutUser = true;

								if($scope.PunchoutSession && $scope.PunchoutSession.PunchOutOperation == 'Edit') $location.path('cart');
								else if($scope.PunchoutSession && $scope.PunchoutSession.PunchoutLandingCategory) $location.path('catalog/' + $scope.PunchoutSession.PunchoutLandingCategory);
								else if($scope.PunchoutSession && $scope.PunchoutSession.PunchoutLandingProduct) $location.path('product/' + $scope.PunchoutSession.PunchoutLandingProduct);
								store.set('punchoutconfig','true');
							}
						});
					}

					//SPENDING ACCOUNTS NAV
					SpendingAccount.query(function(data) {
						$scope.userSpendingAccounts = data;
					});

					if (!$scope.user.TermsAccepted)
						$location.path('conditions');

					if (user.CurrentOrderID) {
						Order.get(user.CurrentOrderID, function (ordr) {
							$scope.currentOrder = ordr;
							OrderConfig.costcenter(ordr, user);
						});
					}
					else
						$scope.currentOrder = null;

					if (user.Company.GoogleAnalyticsCode) {
						GoogleAnalytics.analyticsLogin(user.Company.GoogleAnalyticsCode);
					}
					Category.tree(function (data) {
						$scope.tree = data;
						$scope.$broadcast("treeComplete", data);
					});
					$timeout(function(){
						var type = User.giftItemType($scope.user);
						var notice = GIFT_NOTICES[type];
						if(notice && !localStorage.getItem("giftItemNotice")){
							localStorage.setItem("giftItemNotice",1);
							openGiftModal(notice);
						}
					},1000);
				}
			});
		}
	}

	try {
		trackJs.configure({
			trackAjaxFail: false
		});
	}
	catch(ex) {}

	$scope.errorSection = '';

	function cleanup() {
		Security.clear();
	}

	$scope.$on('event:auth-loginConfirmed', function(){
		$route.reload();
	});
	$scope.$on("$routeChangeSuccess", init);
	$scope.$on('event:auth-loginRequired', cleanup);
}]);
