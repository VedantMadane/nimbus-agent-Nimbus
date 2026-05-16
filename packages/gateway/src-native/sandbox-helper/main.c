#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <sys/capability.h>

static int mode_check_caps(void) {
    cap_t caps = cap_get_proc();
    if (!caps) {
        fprintf(stderr, "cap_get_proc failed: %s\n", strerror(errno));
        return 1;
    }
    cap_flag_value_t value = CAP_CLEAR;
    if (cap_get_flag(caps, CAP_NET_ADMIN, CAP_PERMITTED, &value) != 0) {
        fprintf(stderr, "cap_get_flag failed: %s\n", strerror(errno));
        cap_free(caps);
        return 1;
    }
    cap_free(caps);
    if (value != CAP_SET) {
        fprintf(stderr, "CAP_NET_ADMIN not in permitted set; "
                        "run `setcap cap_net_admin+ep` on this binary\n");
        return 1;
    }
    printf("OK\n");
    return 0;
}

static int mode_enforce_and_exec(int argc, char **argv) {
    (void)argc; (void)argv;
    fprintf(stderr, "enforce-and-exec mode not yet implemented (Task 6)\n");
    return 2;
}

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr,
            "usage:\n"
            "  %s --check-caps\n"
            "  %s --allow <host> [--allow <host> ...] -- <argv...>\n",
            argv[0], argv[0]);
        return 2;
    }
    if (strcmp(argv[1], "--check-caps") == 0) {
        return mode_check_caps();
    }
    if (strcmp(argv[1], "--allow") == 0) {
        return mode_enforce_and_exec(argc, argv);
    }
    fprintf(stderr, "unknown mode: %s\n", argv[1]);
    return 2;
}
