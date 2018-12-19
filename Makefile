CI_BUILD_NUMBER ?= $(USER)-snapshot
VERSION ?= 8.3.$(CI_BUILD_NUMBER)

version:
	@echo $(VERSION)
