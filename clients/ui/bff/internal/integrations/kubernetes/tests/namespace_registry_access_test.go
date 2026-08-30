package tests

import (
	"context"

	"github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	"github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes/k8mocks"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

var _ = Describe("CanNamespaceAccessRegistry (shared)", func() {
	Context("when the authenticated user has access to the registry", func() {
		It("returns true through the user's delegated group", func() {
			ctx := context.Background()
			identity := &kubernetes.RequestIdentity{
				UserID: k8mocks.DefaultTestUsers[1].UserName,
				Groups: k8mocks.DefaultTestUsers[1].Groups,
			}
			allowed, err := kubernetes.CanNamespaceAccessRegistry(ctx, clientset, logger, identity, "model-registry-dora", "dora-namespace")
			Expect(err).NotTo(HaveOccurred())
			Expect(allowed).To(BeTrue())
		})
	})

	Context("when the authenticated user has no access to the registry", func() {
		It("returns false for an unrelated namespace", func() {
			ctx := context.Background()
			identity := &kubernetes.RequestIdentity{
				UserID: k8mocks.DefaultTestUsers[2].UserName,
				Groups: k8mocks.DefaultTestUsers[2].Groups,
			}
			allowed, err := kubernetes.CanNamespaceAccessRegistry(ctx, clientset, logger, identity, "model-registry-dora", "dora-namespace")
			Expect(err).NotTo(HaveOccurred())
			Expect(allowed).To(BeFalse())
		})
	})
})
