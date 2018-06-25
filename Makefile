CI_BUILD_NUMBER ?= $(USER)-snapshot
VERSION ?= 8.2.$(CI_BUILD_NUMBER)

version:
	@echo $(VERSION)
