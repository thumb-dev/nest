four51.app.directive('ordersummary', ['Order', 'Coupon', function(Order, Coupon) {
    var obj = {
        restrict: 'AE',
        templateUrl: 'partials/controls/orderSummary.html',
        controller: ['$scope', function($scope) {
            var save = function(callback) {
                Order.save($scope.currentOrder,
                    function(data) {
                        $scope.currentOrder = data;
                        if (callback) callback($scope.currentOrder);
                    }
                );
            };

            $scope.currentOrder = $scope.currentOrder || {};

            $scope.applyCoupon = function() {
                if (!$scope.currentOrder.CouponCode) return; // Ensure there's a coupon to apply

                var cache = angular.copy($scope.currentOrder);
                $scope.couponLoadingIndicator = true;
                $scope.couponError = null;

                Coupon.apply($scope.currentOrder.CouponCode,
                    function(coupon) {
                        $scope.currentOrder.Coupon = coupon;
                        save(function() {
                            angular.forEach($scope.currentOrder.OrderFields, function(field) {
                                if (field.Name == 'CG_IntegrationField2') {
                                    field.Value = $scope.currentOrder.Coupon.CouponCode;
                                }
                                console.log('field value', field.Value);
                            });

                            $scope.couponLoadingIndicator = false;
                            $scope.currentOrder.CreditCard = cache.CreditCard;
                        });
                    },
                    function(ex) {
                        $scope.couponError = ex.Message;
                        $scope.couponLoadingIndicator = false;
                    }
                );
            };

            $scope.removeCoupon = function() {
                var cache = angular.copy($scope.currentOrder);
                $scope.couponError = null;
                $scope.couponRemoveIndicator = true;

                Coupon.remove(function() {
                    save(function() {
                        angular.forEach($scope.currentOrder.OrderFields, function(field) {
                            if (field.Name == 'CG_IntegrationField2') {
                                field.Value = '';
                            }
                            console.log('remove field value', field.Value);
                        });

                        $scope.couponRemoveIndicator = false;
                        $scope.currentOrder.CreditCard = cache.CreditCard;
                    });
                });
            };


        }]
    };
    return obj;
}]);
