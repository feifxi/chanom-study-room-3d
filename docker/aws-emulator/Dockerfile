# AWS Emulator (https://github.com/aws/aws-emulator) for local development and tests.
# AWS publishes no image, only packages; this is their Dockerfile with the version pinned so
# everyone runs the same one. Upgrade on purpose: bump EMULATOR_VERSION (list:
# https://downloads.aws.com/aws-emulator/packages/aws-emulator/LTS/versions.json).
FROM public.ecr.aws/amazonlinux/amazonlinux:2023-minimal
ARG EMULATOR_VERSION=1.0.556
ARG TARGETARCH
RUN case "$TARGETARCH" in arm64) arch=aarch64 ;; *) arch=x86_64 ;; esac \
    && curl -fsSL -o /tmp/aws-emulator.rpm \
      "https://downloads.aws.com/aws-emulator/packages/aws-emulator/LTS/aws-emulator-${EMULATOR_VERSION}-1-${arch}.rpm" \
    && rpm -i /tmp/aws-emulator.rpm && rm /tmp/aws-emulator.rpm \
    && mkdir -p /home/emulator && chown 1000 /home/emulator
USER 1000
ENV HOME=/home/emulator EMULATOR_BIND_ADDRESS=0.0.0.0
ENTRYPOINT ["aws-emulator"]
